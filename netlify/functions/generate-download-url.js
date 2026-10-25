import { createClient } from '@supabase/supabase-js'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getCorsOrigin(origin) {
  if (!origin) return 'https://lacasadezolve.com'
  if (
    origin === 'https://lacasadezolve.com' ||
    origin === 'https://www.lacasadezolve.com' ||
    origin.endsWith('.netlify.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')
  ) {
    return origin
  }
  return 'https://lacasadezolve.com'
}

export const handler = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin
  const headers = {
    'Access-Control-Allow-Origin': getCorsOrigin(origin),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }

  try {
    const { order_item_id } = JSON.parse(event.body)
    if (!order_item_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing order_item_id' }) }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error de configuración del servidor.' }) }
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    let user = null;
    const authHeader = event.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data, error } = await supabase.auth.getUser(token)
      if (!error && data?.user) {
        user = data.user
      }
    }

    // Fetch order item, order, and product
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select('*, order:orders(*), product:products(*)')
      .eq('id', order_item_id)
      .single()

    if (itemError || !orderItem) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order item not found' }) }

    // Verify ownership and order status
    // Si la orden pertenece a un usuario registrado, se exige que coincida con la sesión actual.
    // Si la orden fue compra como invitado (sin user_id), se permite la descarga mediante el identificador único del pedido.
    if (orderItem.order.user_id) {
      if (!user || orderItem.order.user_id !== user.id) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden. Debes iniciar sesión con la cuenta que compró el producto.' }),
        }
      }
    }
    
    const validStatuses = ['paid', 'processing', 'shipped', 'delivered']
    if (!validStatuses.includes(orderItem.order.status)) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Order is not paid' }) }
    if (!orderItem.product.is_downloadable || !orderItem.product.downloadable_file_url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Product is not downloadable' }) }

    // Check or Create user_digital_downloads record
    let { data: downloadRecord } = await supabase
      .from('user_digital_downloads')
      .select('*')
      .eq('order_id', orderItem.order.id)
      .eq('product_id', orderItem.product.id)
      .single()

    if (!downloadRecord) {
      const { data: newRecord, error: insertError } = await supabase
        .from('user_digital_downloads')
        .insert({
          user_id: orderItem.order.user_id || null,
          order_id: orderItem.order.id,
          product_id: orderItem.product.id,
          file_url: orderItem.product.downloadable_file_url,
          downloads_count: 0,
          max_downloads: 5
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      downloadRecord = newRecord
    }

    // Check limits
    if (downloadRecord.max_downloads !== null && downloadRecord.downloads_count >= downloadRecord.max_downloads) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Download limit reached (Max: 5)' }) }
    }

    if (downloadRecord.expires_at && new Date(downloadRecord.expires_at) < new Date()) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Download link expired' }) }
    }

    // Extract object key
    let objectKey = orderItem.product.downloadable_file_url;
    try {
      if (objectKey.startsWith('http')) {
        const urlObj = new URL(objectKey);
        objectKey = urlObj.pathname.substring(1);
      }
    } catch (e) {
      console.warn("Could not parse URL", e);
    }
    objectKey = decodeURIComponent(objectKey);

    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME || 'lacasadezolve'

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.error('R2 credentials missing - cannot generate signed URL')
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error de configuración del servidor.' }) }
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
    const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey })
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    // Increment count
    await supabase
      .from('user_digital_downloads')
      .update({ downloads_count: downloadRecord.downloads_count + 1 })
      .eq('id', downloadRecord.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        url: signedUrl,
        downloads_count: downloadRecord.downloads_count + 1,
        max_downloads: downloadRecord.max_downloads
      })
    }
  } catch (error) {
    console.error('Error generating download URL:', error, error?.message, error?.stack)
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: 'Error interno al generar el enlace de descarga.' 
      }) 
    }
  }
}
