'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createCustomer } from '@/actions/customer'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { emailPattern, maxCompanyLength, maxNameLength, maxPhoneLength } from '@/lib/src/constants'

type NewCustomerFormValues = {
    name: string
    surname: string
    email: string
    phone: string
    company: string
}

export default function NewCustomerPageClient() {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<NewCustomerFormValues>({
        defaultValues: { name: '', surname: '', email: '', phone: '', company: '' },
    })

    return (
        <div className='container mx-auto p-4'>
            <Card className='mx-auto w-full max-w-2xl'>
                <CardHeader>
                    <CardTitle>Yeni Müşteri</CardTitle>
                    <CardDescription>Müşteri bilgilerini girin. Yıldızlı alanlar zorunludur.</CardDescription>
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

                            <Field data-invalid={Boolean(errors.email)}>
                                <FieldLabel htmlFor='email'>Email *</FieldLabel>
                                <Input
                                    id='email'
                                    type='email'
                                    placeholder='ornek@mail.com'
                                    aria-invalid={Boolean(errors.email)}
                                    {...register('email', {
                                        required: 'Email zorunludur',
                                        pattern: { value: emailPattern, message: 'Geçerli bir email girin' },
                                    })}
                                />
                                <FieldError errors={[errors.email]} />
                            </Field>

                            <div className='grid gap-4 sm:grid-cols-2'>
                                <Field data-invalid={Boolean(errors.phone)}>
                                    <FieldLabel htmlFor='phone'>Telefon</FieldLabel>
                                    <Input
                                        id='phone'
                                        type='tel'
                                        placeholder='0555 555 55 55'
                                        aria-invalid={Boolean(errors.phone)}
                                        {...register('phone', {
                                            maxLength: {
                                                value: maxPhoneLength,
                                                message: `Telefon en fazla ${maxPhoneLength} karakter olabilir`,
                                            },
                                        })}
                                    />
                                    <FieldError errors={[errors.phone]} />
                                </Field>

                                <Field data-invalid={Boolean(errors.company)}>
                                    <FieldLabel htmlFor='company'>Firma</FieldLabel>
                                    <Input
                                        id='company'
                                        aria-invalid={Boolean(errors.company)}
                                        {...register('company', {
                                            maxLength: {
                                                value: maxCompanyLength,
                                                message: `Firma en fazla ${maxCompanyLength} karakter olabilir`,
                                            },
                                        })}
                                    />
                                    <FieldError errors={[errors.company]} />
                                </Field>
                            </div>
                        </FieldGroup>
                    </CardContent>
                    <CardFooter className='mt-6 flex justify-end gap-2'>
                        <Link href='/app/customers' className={buttonVariants({ variant: 'outline' })}>
                            İptal
                        </Link>
                        <Button type='submit' disabled={isSubmitting}>
                            {isSubmitting && <Spinner />}
                            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )

    async function onSubmit(values: NewCustomerFormValues) {
        const result = await createCustomer(values)

        if (!result.status) {
            toast.error(result.message ?? 'Müşteri oluşturulamadı')
            return
        }

        toast.success(result.message ?? 'Müşteri oluşturuldu')
        router.push(result.href ?? '/app/customers')
    }
}
