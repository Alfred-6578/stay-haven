import React from 'react'
import { GoArrowUpRight } from 'react-icons/go'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'inverse'

interface ArrowIconProps {
    variant?: Variant
    className?: string
}

const ArrowIcon = ({ variant = 'primary', className = '' }: ArrowIconProps) => {
    const backgroundClass = variant === 'primary'
        ? 'bg-foreground-inverse text-foreground'
        : variant === 'inverse'
        ? 'bg-foreground text-foreground-inverse'
        : 'bg-foreground text-foreground-inverse'

   

    return (
        <span className={`${backgroundClass} rounded-full p-1 hover:rotate-90 cursor-pointer group-hover:rotate-90 transition-transform ${className}`}>
            <GoArrowUpRight className={`font-black text-xl`} />
        </span>
    )
}

export default ArrowIcon