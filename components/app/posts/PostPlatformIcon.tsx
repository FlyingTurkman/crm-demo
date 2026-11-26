import type { PostPlatform } from '@prisma/client'
import type { IconType } from 'react-icons'
import { FaXTwitter } from 'react-icons/fa6'
import {
    IoEllipsisHorizontalCircle,
    IoGlobe,
    IoLogoFacebook,
    IoLogoInstagram,
    IoLogoLinkedin,
    IoLogoPinterest,
    IoLogoTiktok,
    IoLogoYoutube,
    IoMail,
} from 'react-icons/io5'

const platformIcons: Record<PostPlatform, IconType> = {
    instagram: IoLogoInstagram,
    tiktok: IoLogoTiktok,
    facebook: IoLogoFacebook,
    x: FaXTwitter,
    linkedin: IoLogoLinkedin,
    youtube: IoLogoYoutube,
    pinterest: IoLogoPinterest,
    website: IoGlobe,
    email: IoMail,
    other: IoEllipsisHorizontalCircle,
}

export default function PostPlatformIcon({ platform, className }: { platform: PostPlatform, className?: string }) {
    const Icon = platformIcons[platform]

    return (
        <Icon className={className} aria-hidden />
    )
}
