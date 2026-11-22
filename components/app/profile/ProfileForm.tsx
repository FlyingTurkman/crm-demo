'use client'

import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { updateProfile } from '@/actions/profile'
import { useSiteContext } from '@/components/app/context/SiteContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { UserDto } from '@/dtos/userDTO'
import { maxNameLength } from '@/lib/src/constants'

type ProfileFormValues = {
    name: string
    surname: string
}

// Name and surname of the logged-in user. Email and role are changed by an admin.
export default function ProfileForm({ user }: { user: UserDto }) {
    const { setUser } = useSiteContext()
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ProfileFormValues>({
        defaultValues: { name: user.name, surname: user.surname },
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profil Bilgileri</CardTitle>
                <CardDescription>Adınız menüde ve kayıtlarda görünür.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent>
                    <FieldGroup>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <Field data-invalid={Boolean(errors.name)}>
                                <FieldLabel htmlFor='profile-name'>Ad *</FieldLabel>
                                <Input
                                    id='profile-name'
                                    autoComplete='given-name'
                                    aria-invalid={Boolean(errors.name)}
                                    {...register('name', {
                                        validate: function (value) {
                                            return value.trim().length > 0 || 'Ad zorunludur'
                                        },
                                        maxLength: {
                                            value: maxNameLength,
                                            message: `Ad en fazla ${maxNameLength} karakter olabilir`,
                                        },
                                    })}
                                />
                                <FieldError errors={[errors.name]} />
                            </Field>
                            <Field data-invalid={Boolean(errors.surname)}>
                                <FieldLabel htmlFor='profile-surname'>Soyad *</FieldLabel>
                                <Input
                                    id='profile-surname'
                                    autoComplete='family-name'
                                    aria-invalid={Boolean(errors.surname)}
                                    {...register('surname', {
                                        validate: function (value) {
                                            return value.trim().length > 0 || 'Soyad zorunludur'
                                        },
                                        maxLength: {
                                            value: maxNameLength,
                                            message: `Soyad en fazla ${maxNameLength} karakter olabilir`,
                                        },
                                    })}
                                />
                                <FieldError errors={[errors.surname]} />
                            </Field>
                        </div>
                        <Field>
                            <FieldLabel htmlFor='profile-email'>Email</FieldLabel>
                            <Input id='profile-email' value={user.email} readOnly disabled />
                            <FieldDescription>Email adresinizi ve rolünüzü sadece bir admin değiştirebilir.</FieldDescription>
                        </Field>
                    </FieldGroup>
                </CardContent>
                <CardFooter className='mt-4 justify-end'>
                    <Button type='submit' disabled={isSubmitting || !isDirty}>
                        {isSubmitting && <Spinner />}
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )

    async function onSubmit(values: ProfileFormValues) {
        const result = await updateProfile(values)

        if (!result.status || !result.user) {
            toast.error(result.message ?? 'Profil güncellenemedi')
            return
        }

        toast.success(result.message ?? 'Profil güncellendi')
        // Layouts don't re-render on the client, so the menu reads the new name from the context
        setUser(result.user)
        reset({ name: result.user.name, surname: result.user.surname })
    }
}
