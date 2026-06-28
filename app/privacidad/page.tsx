import React from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad | Chefsy',
  description: 'Conocé cómo protegemos y administramos tus datos personales en Chefsy.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#121212] py-20 px-4">
      <div className="max-w-3xl mx-auto bg-[#1a1a1a] rounded-3xl p-8 md:p-12 border border-[#2a2a2a] shadow-2xl relative">
        <Link 
          href="https://chefsy.xyz" 
          className="inline-flex items-center gap-2 text-chefsy-500 hover:text-chefsy-400 transition-colors font-bold text-sm mb-8"
        >
          <ArrowLeft size={16} />
          Volver a la tienda
        </Link>

        <h1 className="font-bebas text-5xl text-white mb-8 tracking-wide">Política de Privacidad</h1>
        
        <div className="space-y-8 text-slate-300 font-sans leading-relaxed">
          <section>
            <p className="text-sm">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>
            <p className="mt-4">
              En <strong>Chefsy</strong>, valoramos tu privacidad y nos comprometemos a proteger tus datos personales. 
              Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos tu información 
              cuando utilizás nuestro sitio web y servicios de delivery gastronómico.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">1. Información que Recopilamos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Datos de Cuenta:</strong> Nombre, dirección de correo electrónico y número de teléfono proporcionados al iniciar sesión mediante Google o SMS.</li>
              <li><strong>Datos de Entrega:</strong> Tu dirección física, ubicación geográfica (coordenadas GPS si autorizás) y referencias para concretar las entregas.</li>
              <li><strong>Historial de Compras:</strong> Platos solicitados, montos abonados, y tu saldo de fidelización (Chefsitos).</li>
              <li><strong>Datos de Navegación:</strong> Uso de cookies técnicas estrictamente necesarias para mantener tu sesión activa y guardar el carrito de compras.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">2. Cómo Utilizamos tu Información</h2>
            <p>Usamos tus datos personales exclusivamente para los siguientes fines:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Procesar y entregar tus pedidos de comida de manera eficiente.</li>
              <li>Enviarte notificaciones y confirmaciones sobre el estado de tu pedido (vía WhatsApp o email).</li>
              <li>Gestionar tu billetera de recompensas (Chefsitos) y aplicar tus beneficios.</li>
              <li>Mejorar nuestra plataforma y atención al cliente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">3. Compartir Información</h2>
            <p>
              En Chefsy <strong>NO vendemos, alquilamos ni comercializamos</strong> tu información personal a terceros. 
              Tus datos solo son compartidos internamente con nuestro equipo de cocina y logística (Cadetes) 
              exclusivamente a los fines de completar la entrega de tu pedido.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">4. Seguridad de los Datos</h2>
            <p>
              Toda tu información está alojada en servidores seguros (mediante nuestro proveedor Supabase) 
              y las transmisiones de datos se realizan bajo protocolos encriptados (HTTPS). 
              Aseguramos tus tokens de autenticación para que nadie, excepto vos, pueda acceder a tus Chefsitos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">5. Tus Derechos</h2>
            <p>
              Tenés derecho a acceder, corregir o solicitar la eliminación de tus datos personales en cualquier momento. 
              Para ejercer estos derechos, podés contactarnos directamente a través de nuestro soporte oficial en WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bebas text-chefsy-400 tracking-wide mb-3">6. Cambios en la Política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente para reflejar cambios en nuestras prácticas. 
              Cualquier modificación será publicada en esta misma página.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
