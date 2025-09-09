'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createIntersectionObserver } from '@/lib/performance-utils'

interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  placeholder?: string
  priority?: boolean
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+',
  priority = false
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (priority) return

    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer?.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '50px' }
    )

    if (observer && imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer?.disconnect()
  }, [priority])

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {isInView ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          priority={priority}
          placeholder="blur"
          blurDataURL={placeholder}
        />
      ) : (
        <div 
          className="w-full h-full bg-muted animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-muted-foreground text-sm">Carregando...</div>
        </div>
      )}
    </div>
  )
}