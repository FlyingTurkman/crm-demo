'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { IoCode, IoDocumentText, IoKey, IoLayers, IoLogoGithub, IoMail, IoShieldCheckmark } from 'react-icons/io5'
import { toast } from 'sonner'
import { login } from '@/actions/auth'
import { useSiteContext } from '@/components/app/context/SiteContext'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
    apiBasePath,
    demoAccounts,
    emailPattern,
    githubApiDocsUrl,
    githubReadmeUrl,
    githubRepoUrl,
    githubTechChoicesUrl,
    maxPasswordLength,
    minPasswordLength,
    userRoleLabels,
} from '@/lib/src/constants'

type LoginFormValues = {
    email: string
    password: string
}

const roleDescriptions = {
    admin: 'Her şeyi yapabilir: silme işlemleri ve Admin Paneli (kullanıcı yönetimi) dahil.',
    moderator: 'Müşteri, içerik ve not ekleyip düzenleyebilir; silme yapamaz, Admin Paneli görmez.',
}

// Left: demo accounts, right: login form. On phones the form comes first.
export default function LoginPageClient() {
    const router = useRouter()
    const { setUser } = useSiteContext()
    const {
        register,
        handleSubmit,
        setValue,
        clearErrors,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        defaultValues: { email: '', password: '' },
    })

    return (
        <main className='grid min-h-screen md:grid-cols-2'>
            <section className='order-2 flex flex-col justify-center gap-6 bg-primary p-6 text-primary-foreground md:order-1 md:p-12'>
                <div className='flex flex-col gap-2'>
                    <div className='flex items-center gap-2 text-2xl font-semibold'>
                        <IoShieldCheckmark aria-hidden /> CRM Demo
                    </div>
                    <p className='text-primary-foreground/80'>
                        Uygulamayı denemek için aşağıdaki hesaplardan biriyle giriş yapabilirsiniz.
                        REST API&apos;yi ({apiBasePath}) denemek için giriş yaptıktan sonra Profilim sayfasından
                        kendi API token&apos;ınızı oluşturun; token yalnızca bir kez gösterilir.
                    </p>
                </div>

                <div className='flex flex-col gap-4'>
                    {demoAccounts.map((account) => (
                        <Card key={account.email} className='gap-3'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'>
                                    {userRoleLabels[account.role]} hesabı
                                    <Badge variant={account.role === 'admin' ? 'default' : 'secondary'}>
                                        {userRoleLabels[account.role]}
                                    </Badge>
                                </CardTitle>
                                <CardDescription>{roleDescriptions[account.role]}</CardDescription>
                            </CardHeader>
                            <CardContent className='flex flex-col gap-3'>
                                <dl className='grid gap-1 text-sm'>
                                    <div className='flex items-center gap-2'>
                                        <IoMail className='text-muted-foreground' aria-hidden />
                                        <dt className='sr-only'>Email</dt>
                                        <dd className='font-mono break-all'>{account.email}</dd>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <IoKey className='text-muted-foreground' aria-hidden />
                                        <dt className='sr-only'>Şifre</dt>
                                        <dd className='font-mono'>{account.password}</dd>
                                    </div>
                                </dl>
                                <Button
                                    type='button'
                                    variant='outline'
                                    className='w-fit'
                                    onClick={function () {
                                        fillAccount(account.email, account.password)
                                    }}
                                >
                                    Bilgileri doldur
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className='flex flex-wrap gap-2'>
                    <a
                        href={githubRepoUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={buttonVariants({ variant: 'secondary' })}
                    >
                        <IoLogoGithub /> GitHub deposu
                    </a>
                    <a
                        href={githubReadmeUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={buttonVariants({ variant: 'secondary' })}
                    >
                        <IoDocumentText /> README
                    </a>
                    <a
                        href={githubApiDocsUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={buttonVariants({ variant: 'secondary' })}
                    >
                        <IoCode /> API Dokümanı
                    </a>
                    <a
                        href={githubTechChoicesUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className={buttonVariants({ variant: 'secondary' })}
                    >
                        <IoLayers /> Kullanılan teknolojiler hakkında
                    </a>
                </div>
            </section>

            <section className='order-1 flex items-center justify-center bg-muted p-4 md:order-2'>
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
            </section>
        </main>
    )

    function fillAccount(email: string, password: string) {
        setValue('email', email)
        setValue('password', password)
        clearErrors()
        toast.info('Giriş bilgileri dolduruldu')
    }

    async function onSubmit(values: LoginFormValues) {
        const result = await login(values)

        if (!result.status) {
            toast.error(result.message ?? 'Giriş yapılamadı')
            return
        }

        setUser(result.user ?? null)
        toast.success(result.message ?? 'Giriş yapıldı')
        router.replace(result.href ?? '/app')
    }
}
