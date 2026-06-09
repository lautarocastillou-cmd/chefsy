'use client'

import { motion } from 'framer-motion'
import React from 'react'

interface Ingredient {
  id: string
  name: string
  zIndex: number
  delay: number
  bgPosY: string
}

const ingredients: Ingredient[] = [
  // Slice 6: Pan base (Bottom of the image -> 100%)
  { id: 'bun-bottom', name: 'Pan Base', zIndex: 10, delay: 0, bgPosY: '100%' },
  // Slice 5: Lechuga (83.3%)
  { id: 'lettuce', name: 'Lechuga', zIndex: 20, delay: 0.25, bgPosY: '83.33%' },
  // Slice 4: Tomate (66.6%)
  { id: 'tomato', name: 'Tomate', zIndex: 30, delay: 0.5, bgPosY: '66.66%' },
  // Slice 3: Carne (50%)
  { id: 'meat', name: 'Carne', zIndex: 40, delay: 0.75, bgPosY: '50%' },
  // Slice 2: Queso (33.3%)
  { id: 'cheese', name: 'Queso Cheddar', zIndex: 50, delay: 1.0, bgPosY: '33.33%' },
  // Slice 1: Bacon (16.6%)
  { id: 'bacon', name: 'Bacon', zIndex: 60, delay: 1.25, bgPosY: '16.66%' },
  // Slice 0: Pan Superior (Top of the image -> 0%)
  { id: 'bun-top', name: 'Pan Superior', zIndex: 70, delay: 1.5, bgPosY: '0%' },
]

export default function BurgerAnimada() {
  return (
    <div className="relative mx-auto w-[320px] h-[350px] md:w-[450px] md:h-[500px]">
      {ingredients.map((item, index) => {
        const initialRotation = index % 2 === 0 ? 5 : -5;
        
        return (
          <motion.div
            key={item.id}
            title={item.name}
            className="absolute inset-0 w-full h-full mix-blend-multiply"
            style={{ 
              zIndex: item.zIndex,
              backgroundImage: "url('/burger-exploded.png')",
              backgroundSize: '100% 700%',
              backgroundPositionX: 'center',
              backgroundPositionY: item.bgPosY,
              backgroundRepeat: 'no-repeat'
            }}
            initial={{ 
              y: -300, 
              opacity: 0, 
              rotate: initialRotation 
            }}
            animate={{ 
              y: 0, 
              opacity: 1, 
              rotate: 0 
            }}
            transition={{
              type: 'spring',
              stiffness: 120,
              damping: 12,
              bounce: 0.45,
              delay: item.delay,
            }}
          />
        )
      })}
    </div>
  )
}
