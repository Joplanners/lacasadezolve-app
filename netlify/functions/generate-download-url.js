import { createClient } from '@supabase/supabase-js'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }

  try {
    const { order_item_id } = JSON.parse(event.body)
    if (!order_item_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing order_item_id' }) }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
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
    if (orderItem.order.user_id) {
       if (!user || orderItem.order.user_id !== user.id) {
           return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden. Debes iniciar sesión con la cuenta que compró el producto.' }) }
       }
    }
    
    if (orderItem.order.status !== 'paid' && orderItem.order.status !== 'processing') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Order is not paid' }) }
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
      // If no R2 credentials, fallback to public URL (in case they didn't setup R2 signing yet)
      await supabase
        .from('user_digital_downloads')
        .update({ downloads_count: downloadRecord.downloads_count + 1 })
        .eq('id', downloadRecord.id)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          url: orderItem.product.downloadable_file_url,
          downloads_count: downloadRecord.downloads_count + 1,
          max_downloads: downloadRecord.max_downloads,
          warning: 'R2 credentials missing, using public URL'
        })
      }
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
    
    // Convertir el error a string seguro para enviarlo al frontend y saber qué falló
    let safeError = {};
    if (error instanceof Error) {
      safeError = { message: error.message, stack: error.stack, name: error.name };
    } else {
      safeError = error;
    }
    
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: 'Internal Server Error', 
        details: safeError,
        raw: String(error)
      }) 
    }
  }
}
