'use client'
import React from 'react'
import { HiOutlineAdjustments } from 'react-icons/hi'

interface RoomTypeOption {
  slug: string
  name: string
}

interface Props {
  selectedType: string
  onTypeChange: (slug: string) => void
  roomTypeOptions: RoomTypeOption[]
  activeFilterCount: number
}

const FilterPills = ({ selectedType, onTypeChange, roomTypeOptions, activeFilterCount }: Props) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
      <button
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
          activeFilterCount > 0
            ? 'bg-foreground text-foreground-inverse border-foreground'
            : 'border-border text-foreground-secondary hover:border-foreground-disabled'
        }`}
      >
        <HiOutlineAdjustments size={14} />
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-foreground-inverse text-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {activeFilterCount}
          </span>
        )}
      </button>
      {['All', ...roomTypeOptions.map(r => r.name)].map((name) => {
        const slug = name === 'All' ? '' : roomTypeOptions.find(r => r.name === name)?.slug || ''
        return (
          <button
            key={name}
            onClick={() => onTypeChange(slug)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
              selectedType === slug
                ? 'bg-foreground text-foreground-inverse border-foreground'
                : 'border-border text-foreground-secondary hover:border-foreground-disabled'
            }`}
          >
            {name}
          </button>
        )
      })}
    </div>
  )
}

export default FilterPills
