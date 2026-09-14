export interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: string
  active: boolean
}

export interface GalleryItem {
  id: string
  src: string
  alt: string
  description: string
  category: string
  date: string
}

export interface Review {
  id: string
  name: string
  text: string
  rating: number
  date: string
  active: boolean
}

export interface Booking {
  id: string
  serviceId: string
  serviceName: string
  date: string
  time: string
  name: string
  phone: string
  comment: string
  createdAt: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface Business {
  id: string
  owner_id: string | null
  name: string
  slug: string
  description: string
  phone: string
  email: string
  city: string
  address: string
  timezone: string
  instagram: string
  telegram: string
  phone_note: string
  avatar_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BusinessInfo {
  name: string
  subtitle: string
  address: string
  phone: string
  email: string
  instagram: string
  telegram: string
  workHours: string
  description: string
}
