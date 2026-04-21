'use client'
import React from 'react'
import Image from 'next/image'
import { HiOutlinePhotograph, HiOutlineClock, HiPlus, HiMinus } from 'react-icons/hi'

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number | string
  category: string
  image: string | null
  prepMinutes: number
}

interface Props {
  item: MenuItem
  quantity: number
  onAdd: () => void
  onIncrement: () => void
  onDecrement: () => void
}

const formatNaira = (v: number | string) =>
  `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Number(v))}`

const MenuItemCard = ({ item, quantity, onAdd, onIncrement, onDecrement }: Props) => {
  const inCart = quantity > 0

  return (
    <div className="bg-foreground-inverse border border-border rounded-2xl overflow-hidden flex flex-col hover:border-foreground-disabled/50 transition-colors group">
      <div className="relative aspect-square bg-foreground-disabled/10">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-foreground-tertiary">
            <HiOutlinePhotograph size={32} />
          </div>
        )}
        <span className="absolute top-2 left-2 bg-foreground-inverse/90 text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
          {item.category}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-foreground font-semibold text-sm">{item.name}</h3>
          <span className="text-foreground font-bold text-sm whitespace-nowrap">{formatNaira(item.price)}</span>
        </div>
        <p className="text-foreground-tertiary text-xs line-clamp-2 mb-3">{item.description}</p>

        <div className="flex items-center justify-between mt-auto">
          <p className="text-foreground-tertiary text-[11px] flex items-center gap-1">
            <HiOutlineClock size={12} />
            ~{item.prepMinutes} min
          </p>

          {inCart ? (
            <div className="flex items-center gap-1 border border-border rounded-full p-1 bg-background-secondary">
              <button
                onClick={onDecrement}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-foreground-disabled/15 text-foreground transition-colors"
                aria-label="Decrease quantity"
              >
                <HiMinus size={12} />
              </button>
              <span className="min-w-[18px] text-center text-sm font-semibold text-foreground tabular-nums">{quantity}</span>
              <button
                onClick={onIncrement}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-foreground text-foreground-inverse hover:opacity-90 transition-colors"
                aria-label="Increase quantity"
              >
                <HiPlus size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="bg-foreground text-foreground-inverse rounded-full px-3 py-1.5 text-xs font-semibold hover:opacity-90 flex items-center gap-1"
            >
              <HiPlus size={12} />
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuItemCard
