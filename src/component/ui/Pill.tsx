import React from 'react'

interface PillProps {
  children: React.ReactNode
  icon?: React.ReactNode
  animated?: boolean
  visible?: boolean
  className?: string
}

const Pill = ({ children, icon, animated = false, visible = true, className = '' }: PillProps) => {
  const animationClasses = animated ? `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` : ''

  return (
    <div className={`flex gap-4 justify-center items-center border border-foreground-disabled text-xs py-1.5 px-4 text-foreground rounded-full ${animationClasses} ${className}`}>
      {children}
      {icon}
    </div>
  )
}

export default Pill