import type { Metadata } from 'next'
import { LabPage } from '@/pages/lab/ui/lab-page'

// Dev-server only: `next.config.ts` adds the `.lab.tsx` extension in
// PHASE_DEVELOPMENT_SERVER, so production builds never see this route.
export const metadata: Metadata = {
	title: 'Cat room lab',
	robots: { index: false, follow: false },
}

export default function Page() {
	return <LabPage />
}
