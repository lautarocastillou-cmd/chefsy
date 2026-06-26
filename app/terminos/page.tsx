import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Términos y Condiciones | Chefsy',
  description: 'Conocé los términos de servicio para utilizar la plataforma Chefsy.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#121212] py-20 px-4">
      <div className="max-w-3xl mx-auto bg-[#1a1a1a] rounded-3xl p-8 md:p-12 border border-[#2a2a2a] shadow-2xl relative">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-chefsy-500 hover:text-chefsy-400 transition-colors font-bold text-sm mb-8"
        >
          <ArrowLeft size={16} />
          Volver a la tienda
        </Link>

        <h1 className="font-bebas text-5xl text-white mb-8 tracking-wide">Términos y Condiciones</h1>
        
        <div className="space-y-8 text-slate-300 font-sans leading-relaxed">
          <section>
            <p className="text-sm">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>
            <p className="mt-4">
              Bienvenido a <strong>Chefsy</strong>. Al acceder y utilizar nuestro sitio web o servicios, 
              aceptás cumplir y estar sujeto a los siguientes Términos y Condiciones de Servicio. 
              Si no estás de acuerdo con alguna parte de estos términos, por favor, no utilices nuestra plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">1. Uso del Servicio</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>El servicio de Chefsy está destinado a usuarios que deseen realizar pedidos de comida para delivery o retiro en el local.</li>
              <li>Al registrarte, te comprometés a proporcionar información precisa, actual y completa.</li>
              <li>Sos responsable de mantener la confidencialidad de tu cuenta y de las credenciales de inicio de sesión.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">2. Pedidos y Envíos</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Todos los pedidos están sujetos a la disponibilidad de los productos en el catálogo.</li>
              <li>Los tiempos de entrega proporcionados son estimaciones y pueden variar debido a factores externos (tráfico, clima, alta demanda).</li>
              <li>Chefsy se reserva el derecho de cancelar un pedido en caso de falta de stock o sospecha de fraude, notificando inmediatamente al cliente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">3. Sistema de Recompensas (Chefsitos)</h2>
            <p>
              El programa de puntos (Chefsitos) es un beneficio exclusivo para clientes registrados.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Los Chefsitos no tienen valor monetario real y no pueden ser canjeados por dinero en efectivo, transferidos ni vendidos.</li>
              <li>Chefsy se reserva el derecho de modificar el porcentaje de cashback, los precios en puntos de los productos o de suspender el programa de recompensas en cualquier momento y sin previo aviso.</li>
              <li>En caso de detectar abuso, fraude o explotación de errores del sistema, Chefsy podrá anular los puntos acumulados y suspender la cuenta del usuario.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">4. Política de Devoluciones y Reclamos</h2>
            <p>
              Si tenés algún inconveniente con tu pedido (plato incorrecto, en mal estado o demora excesiva), 
              deberás comunicarte con nuestro soporte a través de WhatsApp dentro de los 30 minutos posteriores a la entrega.
              Evaluaremos el caso y, si corresponde, procederemos al reemplazo del producto o a la devolución del importe abonado o compensación en Chefsitos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">5. Propiedad Intelectual</h2>
            <p>
              Todo el contenido presente en la plataforma (textos, gráficos, logotipos, imágenes y software) es propiedad 
              de Chefsy o está licenciado bajo los permisos correspondientes, y está protegido por las leyes de propiedad intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">6. Modificaciones a los Términos</h2>
            <p>
              Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. 
              El uso continuado de la plataforma después de cualquier cambio constituirá tu aceptación de los mismos.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
