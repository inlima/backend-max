'use client'

import { useMemo, useState, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { useIsMobile } from '@/hooks/use-mobile'

interface VirtualizedTableProps<T> {
  data: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
  renderMobileItem?: (item: T, index: number) => React.ReactNode
  className?: string
}

export function VirtualizedTable<T>({
  data,
  itemHeight,
  height,
  renderItem,
  renderMobileItem,
  className = ''
}: VirtualizedTableProps<T>) {
  const isMobile = useIsMobile()
  
  const ItemRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index]
    const renderer = isMobile && renderMobileItem ? renderMobileItem : renderItem
    
    return (
      <div style={style} className="border-b">
        {renderer(item, index)}
      </div>
    )
  }, [data, renderItem, renderMobileItem, isMobile])

  // Only use virtualization for large datasets (>50 items)
  if (data.length <= 50) {
    return (
      <div className={className}>
        {data.map((item, index) => {
          const renderer = isMobile && renderMobileItem ? renderMobileItem : renderItem
          return (
            <div key={index} className="border-b">
              {renderer(item, index)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={className}>
      <List
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        overscanCount={5}
      >
        {ItemRenderer}
      </List>
    </div>
  )
}