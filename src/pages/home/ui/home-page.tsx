import { profile } from '@/shared/config/profile'

export function HomePage() {
	return (
		<main className='mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-4 px-4 py-16'>
			<h1 className='font-display text-4xl font-semibold'>
				{profile.name}
			</h1>
			<p className='text-lg text-primary'>{profile.role}</p>
			<p className='text-muted-foreground'>{profile.about}</p>
		</main>
	)
}
