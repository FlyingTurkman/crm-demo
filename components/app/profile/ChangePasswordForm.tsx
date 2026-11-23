'use client'

import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { changePassword } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { maxPasswordLength, minPasswordLength } from '@/lib/src/constants'

type ChangePasswordFormValues = {
    currentPassword: string
    newPassword: string
    newPasswordConfirm: string
}

// Changing the password logs out every other session, this one stays logged in.
// `lockedReason` disables the form (published demo accounts).
export default function ChangePasswordForm({
    lockedReason,
    onChanged
}: {
    lockedReason?: string
    onChanged: () => void
}) {
    const {
        register,
        handleSubmit,
        getValues,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormValues>({
        defaultValues: { currentPassword: '', newPassword: '', newPasswordConfirm: '' },
    })
    const isLocked = Boolean(lockedReason)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Şifre Değiştir</CardTitle>
                <CardDescription>
                    {lockedReason ?? 'Şifreniz değişince diğer cihazlardaki oturumlarınız kapatılır.'}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent>
                    <fieldset disabled={isLocked}>
                        <FieldGroup>
                            <Field data-invalid={Boolean(errors.currentPassword)}>
                                <FieldLabel htmlFor='current-password' className='required'>Mevcut şifre</FieldLabel>
                                <Input
                                    id='current-password'
                                    type='password'
                                    autoComplete='current-password'
                                    aria-invalid={Boolean(errors.currentPassword)}
                                    {...register('currentPassword', {
                                        required: 'Mevcut şifrenizi girin',
                                    })}
                                />
                                <FieldError errors={[errors.currentPassword]} />
                            </Field>
                            <div className='grid gap-4 sm:grid-cols-2'>
                                <Field data-invalid={Boolean(errors.newPassword)}>
                                    <FieldLabel htmlFor='new-password' className='required'>Yeni şifre</FieldLabel>
                                    <Input
                                        id='new-password'
                                        type='password'
                                        autoComplete='new-password'
                                        aria-invalid={Boolean(errors.newPassword)}
                                        {...register('newPassword', {
                                            required: 'Yeni şifre zorunludur',
                                            minLength: {
                                                value: minPasswordLength,
                                                message: `Yeni şifre en az ${minPasswordLength} karakter uzunluğunda olmalıdır`,
                                            },
                                            maxLength: {
                                                value: maxPasswordLength,
                                                message: `Yeni şifre en fazla ${maxPasswordLength} karakter uzunluğunda olmalıdır`,
                                            },
                                            validate: function (value) {
                                                return value !== getValues('currentPassword') || 'Yeni şifre mevcut şifreyle aynı olamaz'
                                            },
                                        })}
                                    />
                                    <FieldError errors={[errors.newPassword]} />
                                </Field>
                                <Field data-invalid={Boolean(errors.newPasswordConfirm)}>
                                    <FieldLabel htmlFor='new-password-confirm' className='required'>Yeni şifre (tekrar)</FieldLabel>
                                    <Input
                                        id='new-password-confirm'
                                        type='password'
                                        autoComplete='new-password'
                                        aria-invalid={Boolean(errors.newPasswordConfirm)}
                                        {...register('newPasswordConfirm', {
                                            required: 'Yeni şifreyi tekrar girin',
                                            validate: function (value) {
                                                return value === getValues('newPassword') || 'Şifreler eşleşmiyor'
                                            },
                                        })}
                                    />
                                    <FieldError errors={[errors.newPasswordConfirm]} />
                                </Field>
                            </div>
                        </FieldGroup>
                    </fieldset>
                </CardContent>
                <CardFooter className='mt-4 justify-end'>
                    <Button type='submit' disabled={isSubmitting || isLocked}>
                        {isSubmitting && <Spinner />}
                        {isSubmitting ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )

    async function onSubmit(values: ChangePasswordFormValues) {
        const result = await changePassword({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
        })

        if (!result.status) {
            toast.error(result.message ?? 'Şifre değiştirilemedi')
            return
        }

        toast.success(result.message ?? 'Şifreniz değiştirildi')
        reset()
        onChanged()
    }
}
