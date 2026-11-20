'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { login } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { emailPattern, maxPasswordLength, minPasswordLength } from '@/lib/src/constants'

type LoginFormValues = {
    email: string
    password: string
}

export default function LoginPageClient() {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        defaultValues: { email: '', password: '' },
    })

    return (
        <main className='flex min-h-screen items-center justify-center bg-muted p-4'>
            <Card className='w-full max-w-sm'>
                <CardHeader>
                    <CardTitle>Giriş Yap</CardTitle>
                    <CardDescription>Panele erişmek için email ve şifrenizi girin</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <FieldGroup>
                            <Field data-invalid={Boolean(errors.email)}>
                                <FieldLabel htmlFor='email'>Email</FieldLabel>
                                <Input
                                    id='email'
                                    type='email'
                                    autoComplete='email'
                                    placeholder='ornek@mail.com'
                                    aria-invalid={Boolean(errors.email)}
                                    {...register('email', {
                                        required: 'Email zorunludur',
                                        pattern: { value: emailPattern, message: 'Geçerli bir email girin' },
                                    })}
                                />
                                <FieldError errors={[errors.email]} />
                            </Field>

                            <Field data-invalid={Boolean(errors.password)}>
                                <FieldLabel htmlFor='password'>Şifre</FieldLabel>
                                <Input
                                    id='password'
                                    type='password'
                                    autoComplete='current-password'
                                    aria-invalid={Boolean(errors.password)}
                                    {...register('password', {
                                        required: 'Şifre zorunludur',
                                        minLength: {
                                            value: minPasswordLength,
                                            message: `Şifreniz en az ${minPasswordLength} karakter uzunluğunda olmalıdır`,
                                        },
                                        maxLength: {
                                            value: maxPasswordLength,
                                            message: `Şifreniz en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`,
                                        },
                                    })}
                                />
                                <FieldError errors={[errors.password]} />
                            </Field>

                            <Button type='submit' className='w-full' disabled={isSubmitting}>
                                {isSubmitting && <Spinner />}
                                {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                            </Button>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </main>
    )

    async function onSubmit(values: LoginFormValues) {
        const result = await login(values)

        if (!result.status) {
            toast.error(result.message ?? 'Giriş yapılamadı')
            return
        }

        toast.success(result.message ?? 'Giriş yapıldı')
        router.replace(result.href ?? '/app')
    }
}
