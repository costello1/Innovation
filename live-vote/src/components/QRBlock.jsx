import React from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import './QRBlock.css'

export default function QRBlock({ url }) {
  return (
    <div className="qrblock">
      <QRCodeCanvas value={url} size={220} includeMargin />
      <small>{url}</small>
    </div>
  )
}
