import React from 'react'

export default function SeoFallbackContent() {
  return (
    <div className="sr-only" aria-hidden="true">
      <h1>Chefsy - Hamburguesas, Lomos y Pizzas en San Fernando del Valle de Catamarca</h1>
      <p>
        Bienvenido a Chefsy. Somos la sandwichería y hamburguesería líder en San Fernando del Valle de Catamarca,
        especializados en hamburguesas artesanales smash, lomitos completos, pizzas a la piedra, milanesas y papas con cheddar.
        Hacé tu pedido online para delivery rápido a domicilio o retiro por el local.
      </p>

      <section>
        <h2>Menú y Especialidades Chefsy</h2>
        <ul>
          <li><strong>Hamburguesas:</strong> Medallones de carne 100% vacuna, pan de papa suave, queso cheddar fundido, panceta crocante y salsas caseras.</li>
          <li><strong>Lomitos:</strong> Bife de lomo tierno, jamón cocido, queso, huevo a la plancha, lechuga, tomate y mayonesa casera en pan recién horneado.</li>
          <li><strong>Pizzas:</strong> Masa artesanal de larga fermentación, salsa de tomates seleccionados y abundante mozzarella.</li>
          <li><strong>Milanesas:</strong> Ternera y pollo con papas fritas crocantes, en sándwich o al plato.</li>
          <li><strong>Papas Fritas:</strong> Clásicas, con queso cheddar fundido, verdeo y panceta crocante.</li>
        </ul>
      </section>

      <section>
        <h2>Zona de Cobertura y Horarios de Atención</h2>
        <p>
          Envíos a domicilio en San Fernando del Valle de Catamarca y zonas aledañas (Valle Viejo).
          Atendemos de Lunes a Sábados de 11:30 a 14:00 hs y de 20:30 a 01:00 hs. Domingos cerrado.
          Teléfono de contacto y pedidos por WhatsApp: +54 383 422-5445.
        </p>
      </section>
    </div>
  )
}
