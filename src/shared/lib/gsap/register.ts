'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)
// Mobile browsers resize the viewport while the URL bar hides; a refresh on
// every such resize would re-pin mid-scroll.
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, ScrollTrigger, useGSAP }
