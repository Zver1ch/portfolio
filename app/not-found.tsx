import Image from 'next/image'
import Link from 'next/link'
import { Routes } from '@/shared/config/routes'
import { CAT_STICKER_SRC } from '@/shared/config/stickers'
import { Button } from '@/shared/ui/button'

export default function NotFound() {
	return (
		<main className='flex min-h-dvh flex-col items-center justify-center gap-4'>
			<Image
				src={CAT_STICKER_SRC}
				alt=''
				width={1024}
				height={1024}
				sizes='7rem'
				className='size-28'
			/>
			<p className='text-muted-foreground text-sm'>404</p>
			<h1 className='text-2xl font-semibold'>Page not found</h1>
			<Button variant='outline' render={<Link href={Routes.main} />}>
				Go home
			</Button>
		</main>
	)
}
