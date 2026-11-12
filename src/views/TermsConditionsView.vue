<script setup>
import { RouterLink } from 'vue-router'
import { useSeoMeta } from '@/composables/useSeoMeta'

useSeoMeta({
  title: 'Términos y Condiciones',
  description:
    'Consulta los términos y condiciones de La Casa de Zolve SpA para el uso de nuestro sitio web y la compra de productos.',
  url: '/terminos-y-condiciones',
})
</script>

<template>
  <div class="legal-page-container">
    <h1>TÉRMINOS Y CONDICIONES</h1>
    <p class="last-updated">Última actualización: 11 de noviembre de 2026</p>

    <h2>I. GENERALIDADES</h2>
    <h3>PRIMERO: GENERALIDADES</h3>
    <p>
      Este documento regula los términos y condiciones bajo los cuales Ud. tiene derecho a acceder y
      usar los servicios del sitio web www.lacasadezolve.com y de cualquier información, texto,
      imagen, archivo digital u otro material comunicado en el sitio web.
    </p>
    <p>
      En este sitio Web podrá usar, sin costo, el software del mismo, accesible desde diversos
      dispositivos (tales como computadores de escritorio, notebooks, tablets y equipos móviles),
      que le permita navegar, visitar, comparar y, si lo desea, adquirir los bienes o productos que
      se exhiben aquí.
    </p>
    <p>
      Le recomendamos que lea detenidamente estas Condiciones e imprima o guarde una copia de las
      mismas para su información.
    </p>
    <p>
      Estos Términos y Condiciones serán aplicados y se entenderán incorporados en cada uno de los
      contratos que celebre con <strong>La Casa de Zolve SpA</strong> por medio de este sitio web.
    </p>
    <p>
      El uso de este sitio web, la aplicación de estos Términos y Condiciones, los actos que ejecute
      y los contratos que celebre por medio de este sitio web, se encuentran sujetos y sometidos a
      las leyes de la República de Chile, en especial a la <strong>Ley N° 19.496</strong> sobre
      Protección de los Derechos de los Consumidores y a la <strong>Ley N° 19.628</strong> sobre
      Protección de la Vida Privada modificada por la <strong>Ley N° 21.719</strong> sobre
      Protección de Datos Personales.
    </p>
    <p>
      <strong>La Casa de Zolve SpA</strong>, por lo tanto, aplicará estrictamente todos los
      beneficios, garantías y derechos reconocidos en favor de los consumidores y titulares de datos
      en la legislación vigente.
    </p>
    <p>
      <strong
        >La Casa de Zolve SpA es una sociedad por acciones constituida en Chile, ROL ÚNICO
        TRIBUTARIO N° 77.446.775-0, con domicilio legal en Eulogía Sánchez 065, Providencia,
        Santiago, Chile. La Casa de Zolve SpA no cuenta con un local físico de atención al público,
        operando exclusivamente como una tienda de comercio electrónico.</strong
      >
    </p>

    <h2>II. COMUNICACIONES</h2>
    <h3>SEGUNDO: COMUNICACIONES</h3>
    <p>
      Para la comunicación de cualquier presentación, consulta, ejercicio de derechos sobre datos
      personales o reclamo a propósito del uso de este sitio, <strong>La Casa de Zolve SpA</strong>
      designa como representante legal a
      <strong>Doña Jacqueline Alejandra Vásquez Diabuno, C.I. 15.609.813-2</strong>, disponible en
      el correo electrónico <strong>contacto@lacasadezolve.com</strong>.
    </p>
    <p>
      <strong>La Casa de Zolve SpA</strong> se obliga a que, en caso de enviarle información
      publicitaria o promocional por correo electrónico (únicamente cuando medie consentimiento
      previo), esta contendrá al menos la siguiente información:
    </p>
    <ol type="a">
      <li>
        Identificación del mensaje, que lo haga reconocible como publicidad o comunicación
        promocional, en el campo de asunto del mensaje.
      </li>
      <li>
        Existencia del derecho del consumidor o usuario a solicitar el cese de envíos de publicidad
        de ese tipo por <strong>La Casa de Zolve SpA</strong> y la obligación de
        <strong>La Casa de Zolve SpA</strong> de suspender esos envíos de inmediato.
      </li>
      <li>
        Un procedimiento simple y eficaz para que el consumidor pueda hacer esa solicitud, indicando
        una dirección electrónica para estos efectos.
      </li>
    </ol>

    <h2>III. LIBERTAD DE NAVEGACIÓN Y ACEPTACIÓN DE LOS TÉRMINOS Y CONDICIONES</h2>
    <h3>TERCERO:</h3>
    <p>
      La mera visita de este sitio no impone ningún tipo de obligación para el usuario, a menos que
      éste exprese de forma inequívoca, por medio de actos positivos, su voluntad de contratar con
      la empresa para adquirir bienes o servicios, en la forma indicada en estos Términos y
      Condiciones.
    </p>
    <p>
      Para aceptar estos Términos y Condiciones, el usuario deberá hacer click donde el sitio web de
      <strong>La Casa de Zolve SpA</strong> ofrezca esta opción en la interfaz del usuario al
      confirmar su compra o registrarse.
    </p>

    <h2>IV. REGISTRO DE USUARIO</h2>
    <h3>CUARTO: REGISTRO</h3>
    <p>
      El registro en el sitio permite al usuario crear una cuenta personal, facilitando el acceso
      confidencial y seguro para la gestión de sus pedidos, la personalización de productos, el
      seguimiento de sus compras, la descarga de sus archivos digitales adquiridos y el guardado de
      sus datos de envío para facilitar futuras compras.
    </p>
    <p>
      En caso de registrarse en el sitio, el usuario contará con credenciales de acceso seguras
      gestionadas mediante nuestro proveedor de autenticación <strong>Supabase</strong> (por correo
      y contraseña encriptada o mediante inicio de sesión con Google OAuth). Respecto de la
      confidencialidad de la clave secreta serán responsables el usuario y el administrador dentro
      del ámbito que a cada uno corresponda.
    </p>

    <h2>V. CÓMO ADQUIRIR NUESTROS PRODUCTOS</h2>
    <h3>QUINTO: PROCESO GENERAL DE COMPRA Y PERSONALIZACIÓN</h3>
    <p>
      Para adquirir los productos ofrecidos en el sitio web —incluyendo productos de papelería
      creativa, vestuario y accesorios fanmade, productos personalizados, packs mayoristas y
      archivos digitales descargables—, el usuario deberá seguir los siguientes pasos:
    </p>
    <ol>
      <li>
        <strong>Selección y Personalización de Productos:</strong> El usuario navegará por el
        catálogo de productos. Si el producto ofrece opciones de personalización (ej. portadas,
        fotografías o especificaciones), el usuario registrado deberá subir las imágenes requeridas
        y/o añadir las indicaciones específicas en el campo de texto correspondiente antes de añadir
        el producto al carro de compras.
      </li>
      <li>
        <strong>Carro de Compras y Checkout:</strong> Una vez añadidos los productos, el usuario
        procederá al carro de compras ("Ver Carrito") y luego a "Finalizar Compra". Podrá revisar el
        detalle de su pedido, aplicar un cupón de descuento válido (si corresponde) y completar el
        formulario de compra con los datos estrictamente necesarios para individualizar al comprador
        y gestionar el despacho (<strong>Nombre completo, RUT, Correo electrónico, Teléfono y
        Dirección de envío</strong> en caso de productos físicos).
      </li>
      <li>
        <strong>Asignación Dinámica de Método de Envío (Productos Físicos):</strong> Para productos
        físicos, el sistema asignará automáticamente la modalidad de despacho según la región
        seleccionada por el comprador en el formulario de envío: despacho dentro de la
        <strong>Región Metropolitana de Santiago</strong> mediante la empresa logística
        <strong>Paket</strong> (con un valor vigente a la fecha de actualización de estas bases de
        <strong>$3.500 CLP</strong> que se suma al total de la compra), o envío hacia
        <strong>otras regiones de Chile</strong> mediante la empresa <strong>Starken</strong> bajo
        la modalidad <strong>"por pagar"</strong>. Para compras compuestas exclusivamente por
        archivos digitales descargables, no aplica costo ni selección de envío físico.
      </li>
      <li>
        <strong>Pago en Línea (Webpay Plus):</strong> El pago de las transacciones a nivel nacional
        se realiza en línea a través de la pasarela segura <strong>Transbank Webpay Plus</strong>
        (tarjetas de débito, crédito y prepago).
      </li>
      <li>
        <strong>Confirmación y Contacto Post-Venta:</strong> Una vez confirmado el pago de forma
        inmediata por Transbank, el usuario verá en pantalla el comprobante de su pedido y recibirá
        un correo electrónico automático de confirmación. En el caso de productos digitales, el
        botón de descarga se habilitará de inmediato. En el caso de productos físicos personalizados,
        La Casa de Zolve SpA podrá contactar al comprador vía WhatsApp o correo electrónico en caso
        de requerir precisiones sobre el diseño o el despacho.
      </li>
      <li>
        <strong>Confección Bajo Demanda y Plazos de Despacho (Productos Físicos):</strong> Dado que
        nuestros productos físicos son confeccionados y personalizados bajo demanda, el plazo de
        preparación y despacho fluctúa entre <strong>dos (2) y tres (3) días hábiles</strong>
        posteriores a la confirmación de la compra. En caso de que los plazos deban ampliarse
        producto de una alta demanda estacional o comercial (por ejemplo, temporada de Navidad o
        campañas especiales), dicho plazo podrá extenderse excepcionalmente hasta por un máximo de
        <strong>cinco (5) días hábiles</strong>, circunstancia que será debidamente informada de
        manera oportuna al comprador.
      </li>
      <li>
        <strong>Perfeccionamiento del Contrato:</strong> El contrato de compraventa se perfecciona
        una vez que el pago ha sido autorizado y confirmado electrónicamente.
      </li>
    </ol>

    <h2>VI. MEDIOS DE PAGO</h2>
    <h3>SEXTO: MEDIOS DE PAGO ACEPTADOS</h3>
    <p>
      Los productos informados en este sitio web podrán ser pagados a través de los siguientes
      medios:
    </p>
    <ol>
      <li>
        <strong>Tarjetas de Crédito, Débito y Prepago (Transbank Webpay Plus):</strong> Aceptamos
        tarjetas bancarias emitidas en Chile para transacciones a nivel nacional a través de la
        plataforma segura <strong>Webpay Plus</strong> de Transbank. El pago se procesa y acredita
        de forma inmediata. No se aceptan pagos mediante transferencia bancaria directa en el sitio
        web.
      </li>
      <li>
        <strong>Incorporación de Nuevos Medios de Pago Electrónicos:</strong> Próximamente se
        incorporarán nuevos medios y pasarelas de pago electrónicas (nacionales e internacionales)
        en nuestro sitio web para facilitar las compras, los cuales serán debidamente informados y
        habilitados en la pantalla de pago (Checkout).
      </li>
    </ol>
    <p>
      Los usuarios declaran entender que <strong>Transbank</strong> es una empresa proveedora de
      servicios de pago electrónico independiente de La Casa de Zolve SpA, por lo que la operación
      técnica de la pasarela Webpay Plus es de exclusiva responsabilidad de dicha entidad.
    </p>

    <h2>VII. DERECHOS, EXCLUSIÓN DE RETRACTO Y GARANTÍAS</h2>
    <h3>SÉPTIMO: DERECHOS Y GARANTÍAS</h3>
    <h4>A. Productos Personalizados:</h4>
    <p>
      <strong
        >De conformidad con el artículo 3° bis, letra b) de la Ley N° 19.496 sobre Protección de los
        Derechos de los Consumidores, en los contratos de adquisición de bienes confeccionados
        conforme a las especificaciones del consumidor (productos personalizados), NO aplica el
        derecho a retracto.</strong
      >
    </p>
    <p>
      Por lo tanto, no se aceptan cambios ni devoluciones por motivos de gusto personal,
      arrepentimiento o errores en las imágenes o textos enviados por el propio cliente una vez que
      el producto personalizado ha entrado en proceso de confección.
    </p>

    <h4>B. Productos Digitales Descargables:</h4>
    <p>
      En el caso de archivos digitales descargables (tales como plantillas, diseños o imprimibles),
      una vez confirmado el pago se habilita de inmediato la descarga en la página de confirmación
      del pedido y en la sección "Mi Perfil" (para usuarios registrados). Por razones de seguridad y
      protección de propiedad intelectual, cada archivo digital cuenta con un
      <strong>límite máximo de 5 descargas por compra</strong> mediante enlaces temporales seguros.
    </p>
    <p>
      <strong>Exclusión de Derecho a Retracto en Archivos Digitales:</strong> Tratándose de
      contenidos digitales cuya descarga inmediata se habilita tras la confirmación del pago y que
      por su naturaleza no pueden ser devueltos sin detrimento, <strong>no aplica el derecho a
      retracto</strong> por arrepentimiento una vez puesto el archivo a disposición del comprador.
      Si el archivo presentara algún defecto técnico de origen que impida su apertura, La Casa de
      Zolve SpA proporcionará sin costo el archivo corregido escribiendo a
      <strong>contacto@lacasadezolve.com</strong>.
    </p>

    <h4>C. Productos Físicos Estándar en Stock (No Personalizados):</h4>
    <p>
      Para productos físicos estándar en stock que no hayan sido confeccionados a medida ni
      personalizados, se aceptarán cambios o devoluciones dentro de los 10 días siguientes a la
      recepción del producto, siempre que el producto se encuentre sin uso, sellado, con todos sus
      accesorios y en su embalaje original en perfectas condiciones.
    </p>

    <h4>D. Garantía Legal (Ley N° 19.496):</h4>
    <p>
      Lo anterior es sin perjuicio de la <strong>garantía legal</strong> establecida en la Ley N°
      19.496. Si un producto físico recibido presenta fallas o defectos de fabricación o no cumple
      con las características técnicas informadas, el consumidor tendrá derecho a optar por la
      reparación gratuita, el cambio del producto o la devolución de la cantidad pagada dentro del
      plazo legal de 6 meses desde la recepción del producto, siempre que el deterioro no sea
      imputable a un hecho o mala manipulación del consumidor. Para ejercer la garantía legal, el
      cliente puede escribir a <strong>contacto@lacasadezolve.com</strong> adjuntando fotografías
      del defecto y su número de pedido.
    </p>

    <h2>VIII. DESPACHO, TARIFAS Y PLAZOS DE ENTREGA DE PRODUCTOS</h2>
    <h3>OCTAVO: MODALIDADES Y CONDICIONES DE ENTREGA</h3>
    <p>
      La entrega de los productos adquiridos en el sitio web se realiza exclusivamente bajo las
      siguientes modalidades, las cuales se activan de forma dinámica en el proceso de pago
      (Checkout) según la región informada por el comprador:
    </p>
    <ol>
      <li>
        <strong>Despacho dentro de la Región Metropolitana (vía Paket):</strong> Los envíos a
        domicilio dentro de la Región Metropolitana de Santiago se realizan por medio de la empresa
        logística <strong>Paket</strong>. Su valor vigente a la fecha de la presente actualización
        de estos Términos y Condiciones es de <strong>$3.500 CLP (tres mil quinientos pesos)</strong>,
        monto que se suma automáticamente al total de la compra en el Checkout al seleccionar la
        Región Metropolitana. En caso de producirse cualquier modificación futura en el valor de los
        envíos, la nueva tarifa será informada oportunamente y de manera previa al comprador en el
        resumen de su pedido antes de proceder al pago.
      </li>
      <li>
        <strong>Envíos a Regiones (vía Starken — Modalidad "Por Pagar"):</strong> Los envíos hacia
        todas las demás regiones de Chile fuera de la Región Metropolitana se realizan mediante la
        empresa de transporte <strong>Starken</strong> bajo la modalidad
        <strong>"por pagar"</strong> (el comprador paga directamente el costo del flete a la empresa
        transportista al momento de recibir su pedido en el destino indicado).
      </li>
      <li>
        <strong>Descarga Digital Inmediata:</strong> Exclusivo para productos digitales
        descargables, sin costo de envío físico y disponible inmediatamente tras la confirmación del
        pago.
      </li>
    </ol>
    <p>
      <strong>Plazos de Preparación y Despacho (Productos Bajo Demanda):</strong> Atendido que los
      productos comercializados por <strong>La Casa de Zolve SpA</strong> son elaborados bajo
      demanda, el plazo de preparación y entrega a la empresa de transporte fluctúa entre
      <strong>dos (2) y tres (3) días hábiles</strong> contados desde la confirmación de la compra.
      En el evento de registrarse períodos extraordinarios de alta demanda —tales como temporada de
      Navidad, fin de año o campañas especiales—, dicho plazo de despacho podrá extenderse
      excepcionalmente hasta por un máximo de <strong>cinco (5) días hábiles</strong>, situación que
      será oportunamente informada al usuario. Una vez entregado el paquete a la empresa de courier
      (Paket o Starken), los tiempos de tránsito hasta el domicilio final dependen de la operación
      logística del transportista, siendo responsabilidad del comprador ingresar una dirección
      exacta y encontrarse disponible para la recepción.
    </p>

    <h2>IX. RESPONSABILIDAD</h2>
    <h3>NOVENO: RESPONSABILIDAD</h3>
    <p>
      <strong>La Casa de Zolve SpA</strong> procurará mantener la disponibilidad continua del sitio
      web www.lacasadezolve.com, sin perjuicio de mantenciones programadas o interrupciones técnicas
      de fuerza mayor ajenas a su control. En el evento de producirse un cobro duplicado demostrado
      sobre un mismo pedido en www.lacasadezolve.com, <strong>La Casa de Zolve SpA</strong>
      reembolsará la suma del sobrepago dentro de un plazo máximo de 10 días hábiles desde la
      recepción del comprobante respectivo en <strong>contacto@lacasadezolve.com</strong>.
    </p>

    <h2>X. PROTECCIÓN DE DATOS PERSONALES, PLAZO DE CONSERVACIÓN Y ELIMINACIÓN DE CUENTA (LEY N° 19.628 Y LEY N° 21.719)</h2>
    <h3>DÉCIMO: TRATAMIENTO Y SEGURIDAD DE LOS DATOS PERSONALES</h3>
    <p>
      <strong>1. Finalidad estricta de los datos recopilados:</strong>
      Los datos personales solicitados al usuario en nuestro sitio web —específicamente
      <strong>Nombre completo, RUT, Correo electrónico, Teléfono y Dirección de despacho</strong>—
      son requeridos <strong>única y exclusivamente para individualizar a la persona que realiza la
      compra, procesar el pago, cumplir con las obligaciones tributarias y gestionar el envío o
      entrega de los productos adquiridos</strong>. En el caso de usuarios que crean una cuenta en
      el sitio web, dichos datos se mantienen en su panel <strong>"Mi Perfil"</strong> con el único
      propósito de facilitar el proceso de futuras compras y conservar el acceso a su historial de
      pedidos y archivos digitales.
    </p>
    <p>
      <strong>2. Prohibición absoluta de venta o cesión comercial:</strong>
      <strong>La Casa de Zolve SpA jamás vende, arrienda, cede ni comercializa bajo ninguna
      circunstancia los datos personales de sus usuarios o compradores a terceros.</strong> Los
      datos solo son procesados a través de la infraestructura tecnológica segura indispensable para
      operar la tienda (como nuestra base de datos y sistema de autenticación en
      <strong>Supabase</strong>, almacenamiento en <strong>Cloudflare</strong>, hosting en
      <strong>Netlify</strong>, correos transaccionales en <strong>Resend</strong>, pagos en
      <strong>Transbank</strong> y, únicamente si el usuario lo consiente de forma expresa en el
      banner de cookies, estadísticas agregadas en <strong>Google Analytics 4</strong> y medición de
      campañas en redes sociales como <strong>Meta / Instagram / Facebook</strong>).
    </p>
    <p>
      <strong>3. Plazo máximo de conservación de datos:</strong>
      En cumplimiento del principio de limitación del plazo de conservación establecido en la
      <strong>Ley N° 21.719</strong>, los datos personales asociados a cuentas de usuario
      registradas se mantendrán mientras el titular mantenga su cuenta activa, y
      <strong
        >no se conservarán por más de doce (12) meses (1 año) de inactividad continua sin contar
        con la renovación del consentimiento del usuario</strong
      >, tras lo cual se procederá a su supresión o anonimización, salvo aquellos antecedentes de
      facturación y compraventa que deban conservarse por mandato legal tributario y contable ante
      el Servicio de Impuestos Internos (SII).
    </p>
    <p>
      <strong>4. Derecho de Supresión: ¿Cómo borrar sus datos personales y eliminar su cuenta definitivamente?</strong>
      Los usuarios tienen derecho a solicitar y ejecutar en cualquier momento y de forma gratuita la
      eliminación total de sus datos personales almacenados en nuestra base de datos en
      <strong>Supabase</strong> a través de cualquiera de las siguientes dos vías:
    </p>
    <ol type="a">
      <li>
        <strong>Eliminación directa desde "Mi Perfil" (Automática):</strong> El usuario registrado
        puede ingresar a su cuenta en la sección <strong>"Mi Perfil"</strong>, desplazarse hasta el
        final de la página a la sección <em>"Privacidad y Eliminación de Datos Personales"</em>,
        activar el interruptor (switch) de confirmación y presionar el botón
        <strong>"Eliminar mi cuenta definitivamente"</strong>. Esto borrará de inmediato sus datos
        personales de su perfil en nuestra base de datos y cerrará su cuenta.
      </li>
      <li>
        <strong>Solicitud por Correo Electrónico:</strong> El titular también puede solicitar en
        cualquier momento la eliminación de sus datos enviando un correo electrónico a
        <strong>contacto@lacasadezolve.com</strong> con el asunto textual
        <strong><code>BORRAR DATOS PERSONALES</code></strong>, indicando en el mensaje su
        <strong>nombre completo y correo electrónico registrado</strong> para poder identificar al
        usuario y proceder a la eliminación definitiva de sus registros en nuestra base de datos.
      </li>
    </ol>
    <p>
      Asimismo, el titular puede ejercer en todo momento sus derechos de
      <strong>Acceso, Rectificación, Supresión (Cancelación), Oposición, Portabilidad y Bloqueo</strong>
      de sus datos personales conforme a la Ley N° 19.628 y la Ley N° 21.719 escribiendo a
      <strong>contacto@lacasadezolve.com</strong>.
    </p>
    <p>
      <strong>5. Interacciones con el Asistente Virtual (ZolveBot):</strong>
      El sitio web cuenta con un asistente virtual informativo denominado
      <strong>ZolveBot</strong>. Se informa expresamente a los usuarios que las consultas enviadas
      en dicho chat se procesan en tiempo real en los
      <strong>servidores de Google LLC (a través de la API de Google Gemini)</strong> con el único
      fin de generar la respuesta automatizada durante la sesión activa, y que
      <strong
        >La Casa de Zolve SpA NO guarda, registra ni almacena en ninguna base de datos los mensajes,
        nombres ni los datos de la interacción con el bot</strong
      >. Al cerrar o actualizar el navegador, la conversación se elimina por completo.
    </p>

    <h2>XI. ALCANCE DE LOS PRECIOS Y PROMOCIONES</h2>
    <h3>DÉCIMO PRIMERO:</h3>
    <p>
      La Casa de Zolve SpA respetará las condiciones y precios bajo los cuales haya contratado con
      los consumidores. Las promociones y descuentos se aplicarán directamente sobre los precios en
      el sitio web o mediante cupones de descuento válidos ingresados antes de pagar. Cualquier
      modificación de precios o stock solo regirá para operaciones futuras y jamás afectará compras
      ya confirmadas.
    </p>

    <h2>XII. PROPIEDAD INTELECTUAL</h2>
    <h3>DÉCIMO SEGUNDO: PROPIEDAD INTELECTUAL</h3>
    <p>
      Todos los contenidos creados originalmente por <strong>La Casa de Zolve SpA</strong> e
      incluidos en www.lacasadezolve.com (diseño del sitio, textos, logotipos, plantillas y diseños
      originales de papelería) son propiedad de <strong>La Casa de Zolve SpA</strong> y están
      protegidos por las leyes chilenas sobre propiedad intelectual.
    </p>
    <p>
      <strong>Contenido proporcionado por el usuario para personalización:</strong> Al subir
      imágenes o textos para personalizar un producto, el usuario declara contar con los derechos o
      autorizaciones necesarias para su uso personal. <strong>La Casa de Zolve SpA</strong> utiliza
      dicho material única y exclusivamente para confeccionar el pedido solicitado por el cliente,
      sin reclamar propiedad sobre él ni compartirlo con terceros.
    </p>

    <h2>XIII. LEGISLACIÓN APLICABLE Y COMPETENCIA</h2>
    <h3>DÉCIMO TERCERO: LEGISLACIÓN APLICABLE Y COMPETENCIA</h3>
    <p>
      Los presentes Términos y Condiciones se rigen por las leyes de la República de Chile.
      Cualquier controversia derivada de su interpretación o cumplimiento será sometida a los
      tribunales competentes de acuerdo con la legislación chilena vigente.
    </p>

    <p><em>Última actualización: 11 de noviembre de 2026.</em></p>
    <div class="back-link">
      <router-link :to="{ name: 'home' }">Volver al Inicio</router-link>
    </div>
  </div>
</template>

<style scoped>
.legal-page-container {
  max-width: 800px;
  margin: 40px auto;
  padding: 25px 35px;
  background-color: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  min-height: 60vh;
  font-family: var(--font-family-base);
  color: var(--color-text);
}
.legal-page-container h1 {
  text-align: center;
  margin-bottom: 10px;
  color: var(--color-heading);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 15px;
  font-size: 1.8rem;
}
.last-updated {
  text-align: center;
  font-size: 0.85em;
  color: #666;
  margin-bottom: 30px;
}
.legal-page-container h2 {
  margin-top: 2em;
  margin-bottom: 1em;
  font-size: 1.4rem;
  color: var(--color-heading);
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}
.legal-page-container h3 {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  font-size: 1.2rem;
  color: var(--color-heading);
  font-weight: var(--font-weight-bold);
}
.legal-page-container h4 {
  margin-top: 1.2em;
  margin-bottom: 0.6em;
  font-size: 1.1rem;
  color: var(--color-heading);
  font-weight: var(--font-weight-medium);
}

.legal-page-container p,
.legal-page-container li {
  text-align: justify;
  line-height: 1.8;
  margin-bottom: 1em;
}
.legal-page-container ol,
.legal-page-container ul {
  margin-left: 25px;
  margin-bottom: 1em;
}
.legal-page-container strong {
  font-weight: var(--font-weight-bold);
}

.back-link {
  text-align: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}
.back-link a {
  color: var(--color-link);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}
.back-link a:hover {
  color: var(--color-link-hover);
  text-decoration: underline;
}

@media (max-width: 820px) {
  .legal-page-container {
    padding: 20px 25px;
  }
}

@media (max-width: 600px) {
  .legal-page-container {
    width: 95%;
    margin: 20px auto;
    padding: 20px 15px;
    min-height: unset;
    border: none;
    background-color: var(--color-background);
  }

  .legal-page-container h1 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  .legal-page-container h2 {
    font-size: 1.2rem;
    margin-top: 1.5em;
    margin-bottom: 0.8em;
  }

  .legal-page-container h3 {
    font-size: 1.1rem;
    margin-top: 1.2em;
    margin-bottom: 0.6em;
  }
  .legal-page-container h4 {
    font-size: 1rem;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .legal-page-container p,
  .legal-page-container li {
    font-size: 0.95rem;
    line-height: 1.7;
    text-align: left;
  }

  .legal-page-container ol,
  .legal-page-container ul {
    margin-left: 20px;
    padding-left: 10px;
  }
  .last-updated {
    font-size: 0.8rem;
    margin-bottom: 20px;
  }
  .back-link {
    margin-top: 30px;
    padding-top: 15px;
  }
}
</style>
