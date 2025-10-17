import React from 'react'
import s from '../styles/QROnlyPage.module.css'

export default function QRPage() {
  const qrSrc = `${import.meta.env.BASE_URL}qr-placeholder.png`
  return (
    <div className={s.wrap}>
      <div className={s.card}>
        <h2 style={{marginTop:0, fontWeight:800, textAlign:'center'}}>Scan to Vote</h2>
        {/* Placeholder image — replace with your QR later */}
        <img
          className={s.image}
          src={qrSrc}
          alt="QR Code placeholder"
        />
      </div>
    </div>
  )
}
