'use client'
import Link from 'next/link'
import React, { ButtonHTMLAttributes, ReactNode } from 'react'
import ArrowIcon from './ArrowIcon'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface BaseProps {
    variant?: Variant
    size?: Size
    withArrow?: boolean
    fullWidth?: boolean
    loading?: boolean
    className?: string
    children: ReactNode
}

interface ButtonAsButton extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {
    href?: never
}

interface ButtonAsLink extends BaseProps {
    href: string
    type?: never
    disabled?: never
    onClick?: never
}

type ButtonProps = ButtonAsButton | ButtonAsLink

const variantClasses: Record<Variant, string> = {
    primary:
        'bg-foreground text-background hover:bg-foreground-hover',
    outline:
        'border border-foreground text-foreground hover:bg-foreground hover:text-background',
    ghost:
        'text-foreground hover:bg-foreground-disabled/20',
    danger:
        'bg-danger text-white hover:bg-danger/90',
}

const sizeClasses: Record<Size, string> = {
    sm: 'text-xs px-3 py-1',
    md: 'text-[15px] px-5 py-1.5',
    lg: 'text-base px-6 py-2.5',
}

const Button = (props: ButtonProps) => {
    const {
        variant = 'primary',
        size = 'md',
        withArrow = false,
        fullWidth = false,
        loading = false,
        className = '',
        children,
    } = props

    const baseClasses = 'group inline-flex items-center justify-center gap-2 rounded-full font-medium cursor-pointer transition-colors backdrop-blur-2xl disabled:opacity-50 disabled:cursor-not-allowed'

    const classes = [
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        withArrow && size === 'md' ? 'pr-1.5' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    const content = (
        <>
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                <>
                    {children}
                    {withArrow && (
                        <ArrowIcon variant={variant} />
                    )}
                </>
            )}
        </>
    )

    if ('href' in props && props.href !== undefined) {
        return (
            <Link href={props.href} className={classes}>
                {content}
            </Link>
        )
    }

    const { variant: _v, size: _s, withArrow: _w, fullWidth: _fw, loading: _l, className: _c, children: _ch, ...buttonRest } = props as ButtonAsButton
    void _v; void _s; void _w; void _fw; void _l; void _c; void _ch;

    return (
        <button
            type={buttonRest.type || 'button'}
            disabled={buttonRest.disabled || loading}
            className={classes}
            {...buttonRest}
        >
            {content}
        </button>
    )
}

export default Button
