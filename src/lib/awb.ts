import { SITE_LEGAL } from './siteLegal'

export const AWB_SERVICE_LABEL = `${SITE_LEGAL.deliverySummary}`

export const AWB_SHIPPER = {
  name: SITE_LEGAL.brandName,
  phone: SITE_LEGAL.contactPhone,
  address: SITE_LEGAL.operatorAddress,
  website: SITE_LEGAL.siteUrl,
} as const
