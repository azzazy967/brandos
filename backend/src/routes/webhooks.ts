import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'

const router = Router()

function verifyWebhookSignature(req: Request, secret: string | undefined, headerName: string): boolean {
  if (!secret) return false // Reject if secret not configured
  const signature = req.headers[headerName] as string | undefined
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

const ARAMEX_STATUS_MAP: Record<string, string> = {
  'Shipment Picked Up': 'in_transit',
  'Out For Delivery': 'in_transit',
  'Delivered': 'delivered',
  'Delivery Failed': 'failed',
  'Returned To Shipper': 'returned',
}

router.post('/aramex', async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSignature(req, process.env.ARAMEX_WEBHOOK_SECRET, 'x-aramex-signature')) {
      res.status(401).json({ success: false, error: 'Invalid webhook signature' })
      return
    }

    const { TrackingNumber, UpdateDescription, CODAmount, CODStatus } = req.body

    if (!TrackingNumber) {
      res.status(400).json({ success: false, error: 'TrackingNumber required' })
      return
    }

    const shipment = await prisma.shipment.findFirst({ where: { trackingNumber: TrackingNumber } })
    if (!shipment) {
      res.status(404).json({ success: false, error: 'Shipment not found' })
      return
    }

    const updateData: Record<string, unknown> = {}
    if (UpdateDescription && ARAMEX_STATUS_MAP[UpdateDescription]) {
      updateData.status = ARAMEX_STATUS_MAP[UpdateDescription]
    }
    if (CODAmount !== undefined) updateData.codAmount = parseFloat(CODAmount)
    if (CODStatus) {
      if (CODStatus === 'Collected') {
        updateData.codStatus = 'collected'
        updateData.codCollectedAt = new Date()
      } else if (CODStatus === 'Pending') {
        updateData.codStatus = 'pending'
      }
    }

    const updated = await prisma.shipment.update({ where: { id: shipment.id }, data: updateData })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Aramex webhook error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const BOSTA_STATUS_MAP: Record<string, string> = {
  'PICKED_UP': 'in_transit',
  'OUT_FOR_DELIVERY': 'in_transit',
  'DELIVERED': 'delivered',
  'DELIVERY_FAILED': 'failed',
  'RETURNED': 'returned',
}

router.post('/bosta', async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSignature(req, process.env.BOSTA_WEBHOOK_SECRET, 'x-bosta-signature')) {
      res.status(401).json({ success: false, error: 'Invalid webhook signature' })
      return
    }

    const { trackingNumber, state, cod } = req.body

    if (!trackingNumber) {
      res.status(400).json({ success: false, error: 'trackingNumber required' })
      return
    }

    const shipment = await prisma.shipment.findFirst({ where: { trackingNumber } })
    if (!shipment) {
      res.status(404).json({ success: false, error: 'Shipment not found' })
      return
    }

    const updateData: Record<string, unknown> = {}
    if (state && BOSTA_STATUS_MAP[state]) {
      updateData.status = BOSTA_STATUS_MAP[state]
    }
    if (cod?.amount !== undefined) updateData.codAmount = parseFloat(cod.amount)
    if (cod?.status) {
      if (cod.status === 'collected') {
        updateData.codStatus = 'collected'
        updateData.codCollectedAt = new Date()
      } else if (cod.status === 'pending') {
        updateData.codStatus = 'pending'
      }
    }

    const updated = await prisma.shipment.update({ where: { id: shipment.id }, data: updateData })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Bosta webhook error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
