'use client'

import Image from 'next/image'
import nounNote from '@/assets/noun-note.svg'
import nounNoteLine from '@/assets/noun-note-line.svg'
import nounDocumentPixel from '@/assets/noun-document-pixel.svg'
import nounDocument from '@/assets/noun-document.svg'

interface DocumentSwirlProps {
  readonly isDark?: boolean
}

export default function DocumentSwirl({ isDark = false }: DocumentSwirlProps) {
  return (
    <div className="relative w-[180px] h-[100px] md:w-[220px] md:h-[120px] lg:w-[284px] lg:h-[165px]">
      {/* Bottom left document - noun-document-pixel.svg (rotated) */}
      <div 
        className="absolute bottom-0 left-0 transition-all duration-500"
        style={{ 
          filter: isDark ? 'brightness(0) invert(1)' : 'none',
        }}
      >
        <Image
          src={nounDocumentPixel}
          alt=""
          width={47}
          height={54}
          className="w-[35px] h-auto md:w-[42px] lg:w-[47px]"
        />
      </div>

      {/* Top middle document - noun-note.svg (tilted left) */}
      <div 
        className="absolute top-0 left-[25%] transition-all duration-500"
        style={{ 
          filter: isDark ? 'brightness(0) invert(1)' : 'none',
        }}
      >
        <Image
          src={nounNote}
          alt=""
          width={50}
          height={59}
          className="w-[30px] h-auto md:w-[38px] lg:w-[50px]"
        />
      </div>

      {/* Top right document - noun-document.svg (rotated) */}
      <div 
        className="absolute top-[15%] right-0 transition-all duration-500"
        style={{ 
          filter: isDark ? 'brightness(0) invert(1)' : 'none',
        }}
      >
        <Image
          src={nounDocument}
          alt=""
          width={54}
          height={64}
          className="w-[32px] h-auto md:w-[40px] lg:w-[54px]"
        />
      </div>

      {/* Swirl line connecting documents - hidden in dark mode */}
      {!isDark && (
        <div className="absolute top-[10%] left-[30%]">
          <Image
            src={nounNoteLine}
            alt=""
            width={119}
            height={94}
            className="w-[80px] h-auto md:w-[100px] lg:w-[119px]"
          />
        </div>
      )}
    </div>
  )
}
