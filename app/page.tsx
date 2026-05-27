'use client'

import React from 'react'
import Link from 'next/link'
import { usarPedidos } from '@/contexto/PedidosContexto'
import { ChevronRight, Star, Clock, Truck, ShieldCheck, MapPin } from 'lucide-react'

export default function PaginaInicio() {
  const { productos } = usarPedidos()
  
  // Seleccionamos algunos productos estrella para el inicio
  const productosDestacados = productos.filter(p => p.activo).slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-chefsy/30">
      
      {/* NAVEGACIÓN */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Chefsy Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Chefsy</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-chefsy transition-colors">Cómo funciona</a>
            <a href="#destacados" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-chefsy transition-colors">Destacados</a>
            <Link href="/tienda" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-chefsy transition-colors">Menú Completo</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hidden sm:block text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
              Empleados
            </Link>
            <Link href="/tienda" className="bg-chefsy hover:bg-chefsy-600 text-white px-5 py-2 rounded-xl text-sm font-extrabold shadow-lg shadow-chefsy/30 active:scale-95 transition-all flex items-center gap-2">
              Pedir Ahora <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-chefsy-50 dark:bg-chefsy-950/50 text-chefsy font-bold text-xs uppercase tracking-widest">
              <Star size={14} className="fill-chefsy" />
              La mejor hamburguesería
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              El mejor sabor <br className="hidden lg:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-chefsy to-emerald-400">
                en tu casa.
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Ingredientes frescos, recetas originales y el toque de Chefsy que ya conocés. 
              Hacé tu pedido online en segundos y disfrutá la experiencia.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
              <Link href="/tienda" className="w-full sm:w-auto bg-chefsy hover:bg-chefsy-600 text-white px-8 py-4 rounded-2xl text-lg font-black shadow-xl shadow-chefsy/30 active:scale-95 transition-all flex items-center justify-center gap-2">
                Ver el Menú <ChevronRight size={20} />
              </Link>
              <a href="#como-funciona" className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-center">
                ¿Cómo funciona?
              </a>
            </div>
            <div className="pt-8 flex items-center gap-6 justify-center lg:justify-start text-sm font-semibold text-slate-500">
              <div className="flex items-center gap-1.5"><Clock size={18} className="text-chefsy"/> Rápido</div>
              <div className="flex items-center gap-1.5"><Truck size={18} className="text-chefsy"/> A domicilio</div>
              <div className="flex items-center gap-1.5"><ShieldCheck size={18} className="text-chefsy"/> Calidad</div>
            </div>
          </div>
          
          <div className="relative mt-10 lg:mt-0">
            {/* Círculo decorativo */}
            <div className="absolute inset-0 bg-gradient-to-tr from-chefsy-200 to-chefsy-50 dark:from-chefsy-900 dark:to-slate-900 rounded-full blur-3xl opacity-50 transform scale-90"></div>
            {/* Imagen Principal */}
            <img 
              src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80" 
              alt="Chefsy Burger" 
              className="relative z-10 w-full max-w-lg mx-auto rounded-[3rem] shadow-2xl object-cover aspect-square border-8 border-white dark:border-slate-800"
            />
            {/* Elemento flotante */}
            <div className="absolute -bottom-6 -left-6 md:-left-10 z-20 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-bounce duration-[3000ms]">
              <div className="bg-yellow-100 dark:bg-yellow-950/50 p-3 rounded-2xl">
                <Star size={24} className="text-yellow-500 fill-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Valoración</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">4.9/5</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">¿Cómo pedir en Chefsy?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Tu comida preferida a solo 3 simples pasos de distancia.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 dark:bg-slate-800 -z-10"></div>
            
            <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto bg-chefsy-100 dark:bg-chefsy-900/30 text-chefsy rounded-3xl flex items-center justify-center text-2xl font-black shadow-inner">1</div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Elegí tu menú</h3>
              <p className="text-sm text-slate-500">Explorá nuestra carta digital, personalizá tus platos y agregalos al carrito.</p>
            </div>
            <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto bg-chefsy-100 dark:bg-chefsy-900/30 text-chefsy rounded-3xl flex items-center justify-center text-2xl font-black shadow-inner">2</div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Confirmá tu orden</h3>
              <p className="text-sm text-slate-500">Ingresá tus datos, elegí cómo querés pagar y enviá el pedido directamente a la cocina.</p>
            </div>
            <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto bg-chefsy-100 dark:bg-chefsy-900/30 text-chefsy rounded-3xl flex items-center justify-center text-2xl font-black shadow-inner">3</div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">¡A disfrutar!</h3>
              <p className="text-sm text-slate-500">Recibí tu comida calentita en tu casa o pasá a retirarla por el local. Así de simple.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTOS DESTACADOS */}
      {productosDestacados.length > 0 && (
        <section id="destacados" className="py-24 px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Platos Destacados</h2>
                <p className="text-slate-500 mt-2">Los favoritos de la casa que no te podés perder.</p>
              </div>
              <Link href="/tienda" className="text-chefsy font-bold hover:underline flex items-center gap-1">
                Ver todos <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {productosDestacados.map(prod => (
                <div key={prod.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                  <div>
                    <div className="h-48 overflow-hidden bg-slate-100 dark:bg-slate-950 relative">
                      <img 
                        src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80" 
                        alt={prod.nombre} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4 bg-chefsy text-white px-2.5 py-1 rounded-full text-xs font-black shadow-lg">
                        Destacado
                      </div>
                    </div>
                    <div className="p-6 pb-2 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight">{prod.nombre}</h3>
                        <span className="font-black text-chefsy whitespace-nowrap">${prod.precio}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        Plato preparado al instante con ingredientes seleccionados de primera calidad de nuestra cocina.
                      </p>
                    </div>
                  </div>
                  <div className="p-6 pt-4">
                    <Link href="/tienda" className="block w-full text-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold py-3.5 rounded-xl transition-colors text-sm">
                      Pedir ahora
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BANNER FINAL */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-chefsy text-white rounded-[3rem] p-10 md:p-16 text-center space-y-8 relative overflow-hidden shadow-2xl">
          {/* Luces de fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400 rounded-full blur-[100px] opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-300 rounded-full blur-[100px] opacity-30"></div>
          
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">¿Listo para hacer tu pedido?</h2>
            <p className="text-chefsy-100 text-lg max-w-xl mx-auto">No des más vueltas. Hacé tu pedido online ahora mismo y te lo llevamos calentito a tu puerta.</p>
            <div className="pt-4">
              <Link href="/tienda" className="inline-flex bg-white text-chefsy px-10 py-4 rounded-2xl text-xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl">
                Ir a la Tienda
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Chefsy Logo" className="w-8 h-8 rounded-lg grayscale brightness-200" />
              <span className="font-black text-xl text-white">Chefsy</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              El mejor sabor, ingredientes de primera calidad y envío rápido. Hecho con ❤️ en Tucumán.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Contacto</h4>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><MapPin size={16} /> San Miguel de Tucumán</p>
              <p className="flex items-center gap-2"><Clock size={16} /> 20:30 - 01:00 hs</p>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Enlaces</h4>
            <div className="flex flex-col space-y-2 text-sm">
              <Link href="/tienda" className="hover:text-white transition-colors">Menú Online</Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">Acceso Empleados</Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-slate-800 text-xs text-center text-slate-500">
          © {new Date().getFullYear()} Chefsy. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}
