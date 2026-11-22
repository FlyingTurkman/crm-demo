'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@prisma/client'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createUser, updateUser } from '@/actions/user'
import { useSiteContext } from '@/components/app/context/SiteContext'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import type { ManagedUserDto } from '@/dtos/userDTO'
import {
    emailPattern,
    maxNameLength,
    maxPasswordLength,
    minPasswordLength,
    userRoleLabels,
} from '@/lib/src/constants'

const userRoles: UserRole[] = ['admin', 'moderator']

type UserFormValues = {
    name: string
    surname: string
    email: string
    role: UserRole
    password: string
    passwordConfirm: string
}

// Used by both the add and the edit page: edits when `user` is given.
// On edit an empty password keeps the current one.
export default function UserForm({ user }: { user?: ManagedUserDto }) {
    const router = useRouter()
    const { user: currentUser } = useSiteContext()
    // An admin can't take away their own admin role (the action checks it too)
    const isSelf = Boolean(user && currentUser && user.id === currentUser.id)
    const {
        register,
        control,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<UserFormValues>({
        defaultValues: {
            name: user?.name ?? '',
            surname: user?.surname ?? '',
            email: user?.email ?? '',
            role: user?.role ?? 'moderator',
            password: '',
            passwordConfirm: '',
        },
    })

    return (
        <Card className='w-full max-w-2xl'>
            <CardHeader>
                <CardTitle>{user ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}</CardTitle>
                <CardDescription>
                    {user ? 'Şifreyi değiştirmek istemiyorsanız şifre alanlarını boş bırakın.' : 'Panele giriş yapacak kullanıcıyı oluşturun.'}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent>
                    <FieldGroup>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <Field data-invalid={Boolean(errors.name)}>
                                <FieldLabel htmlFor='name'>Ad *</FieldLabel>
                                <Input
                                    id='name'
                                    aria-invalid={Boolean(errors.name)}
                                    {...register('name', {
                                        required: 'Ad zorunludur',
                                        maxLength: {
                                            value: maxNameLength,
                                            message: `Ad en fazla ${maxNameLength} karakter olabilir`,
                                        },
                                    })}
                                />
                                <FieldError errors={[errors.name]} />
                            </Field>

                            <Field data-invalid={Boolean(errors.surname)}>
                                <FieldLabel htmlFor='surname'>Soyad *</FieldLabel>
                                <Input
                                    id='surname'
                                    aria-invalid={Boolean(errors.surname)}
                                    {...register('surname', {
                                        required: 'Soyad zorunludur',
                                        maxLength: {
                                            value: maxNameLength,
                                            message: `Soyad en fazla ${maxNameLength} karakter olabilir`,
                                        },
                                    })}
                                />
                                <FieldError errors={[errors.surname]} />
                            </Field>
                        </div>

                        <div className='grid gap-4 sm:grid-cols-[1fr_12rem]'>
                            <Field data-invalid={Boolean(errors.email)}>
                                <FieldLabel htmlFor='email'>Email *</FieldLabel>
                                <Input
                                    id='email'
                                    type='email'
                                    autoComplete='off'
                                    placeholder='ornek@mail.com'
                                    aria-invalid={Boolean(errors.email)}
                                    {...register('email', {
                                        required: 'Email zorunludur',
                                        pattern: { value: emailPattern, message: 'Geçerli bir email girin' },
                                    })}
                                />
                                <FieldError errors={[errors.email]} />
                            </Field>

                            <Field>
                                <FieldLabel>Rol</FieldLabel>
                                <Controller
                                    name='role'
                                    control={control}
                                    render={function ({ field }) {
                                        return (
                                            <Select
                                                items={userRoleLabels}
                                                value={field.value}
                                                disabled={isSelf}
                                                onValueChange={function (value) {
                                                    if (value) {
                                                        field.onChange(value)
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className='w-full'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {userRoles.map((role) => (
                                                        <SelectItem key={role} value={role}>
                                                            {userRoleLabels[role]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )
                                    }}
                                />
                                {isSelf && <FieldDescription>Kendi rolünüzü değiştiremezsiniz</FieldDescription>}
                            </Field>
                        </div>

                        <div className='grid gap-4 sm:grid-cols-2'>
                            <Field data-invalid={Boolean(errors.password)}>
                                <FieldLabel htmlFor='password'>{user ? 'Yeni şifre' : 'Şifre *'}</FieldLabel>
                                <Input
                                    id='password'
                                    type='password'
                                    autoComplete='new-password'
                                    aria-invalid={Boolean(errors.password)}
                                    {...register('password', {
                                        validate: validatePassword,
                                    })}
                                />
                                <FieldError errors={[errors.password]} />
                            </Field>

                            <Field data-invalid={Boolean(errors.passwordConfirm)}>
                                <FieldLabel htmlFor='passwordConfirm'>{user ? 'Yeni şifre (tekrar)' : 'Şifre (tekrar) *'}</FieldLabel>
                                <Input
                                    id='passwordConfirm'
                                    type='password'
                                    autoComplete='new-password'
                                    aria-invalid={Boolean(errors.passwordConfirm)}
                                    {...register('passwordConfirm', {
                                        validate: function (value) {
                                            return value === getValues('password') || 'Şifreler eşleşmiyor'
                                        },
                                    })}
                                />
                                <FieldError errors={[errors.passwordConfirm]} />
                            </Field>
                        </div>
                    </FieldGroup>
                </CardContent>
                <CardFooter className='mt-6 flex justify-end gap-2'>
                    <Link href='/app/admin' className={buttonVariants({ variant: 'outline' })}>
                        İptal
                    </Link>
                    <Button type='submit' disabled={isSubmitting}>
                        {isSubmitting && <Spinner />}
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )

    function validatePassword(value: string) {
        // On edit an empty password means "keep the current one"
        if (!value) {
            return user ? true : 'Şifre zorunludur'
        }
        if (value.length < minPasswordLength) {
            return `Şifre en az ${minPasswordLength} karakter uzunluğunda olmalıdır`
        }
        if (value.length > maxPasswordLength) {
            return `Şifre en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`
        }
        return true
    }

    async function onSubmit(values: UserFormValues) {
        const input = {
            name: values.name,
            surname: values.surname,
            email: values.email,
            role: values.role,
        }
        const result = user
            ? await updateUser({ userId: user.id, ...input, password: values.password })
            : await createUser({ ...input, password: values.password })

        if (!result.status) {
            toast.error(result.message ?? 'Kullanıcı kaydedilemedi')
            return
        }

        toast.success(result.message ?? 'Kullanıcı kaydedildi')
        router.push(result.href ?? '/app/admin')
    }
}
