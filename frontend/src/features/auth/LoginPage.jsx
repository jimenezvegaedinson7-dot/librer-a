import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    FiEnvelope,
    FiEye,
    FiEyeSlash,
    FiLock,
    FiLockKey,
    FiRefreshCw,
} from 'react-icons/fi6';

import { login, verificarLoginOtp } from './authService';
import { useAuth } from './AuthContext';
import { Alert } from '../../components/ui/Alert';
import { useForm, FormInput, FormSelect, FormTextarea } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

import fondoLogin from '../../assets/fondo-login.png';
import logoLibreria from '../../assets/logo-lbl.png';

export default function LoginPage() {
    const navigate = useNavigate();
    const { autenticado, iniciarSesion } = useAuth();

    const [form] = useForm({
        inicial: {
            email: '',
            password: '',
        },
        reglas: {
            email: [requerido, emailValido],
            password: [requerido],
        },
    });

    const { email, password, setError } = form;

    if (autenticado) return <Navigate to="/dashboard" replace />;

    return (
        <main className="relative min-h-screen bg-[var(--color-surface)]">
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${fondoLogin})` }}
            />
            <div className="fixed inset-0 bg-[var(--color-surface)]/5" />

            <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
                <section className="min-w-0 w-full max-w-[440px]">
                    <div className="min-w-0 rounded-2xl border border-border bg-white/80 backdrop-blur-xl p-8 sm:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.3)]">

                        {/* LOGO */}
                        <div className="mb-6 text-center">
                            <img
                                src={logoLibreria}
                                alt="Logo Librería"
                                className="h-24 w-auto object-contain sm:h-32"
                            />
                        </div>

                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Correo electrónico
                                </label>
                                <FiEnvelope className="w-4 h-4 mb-2 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={form.manejarCambio}
                                    placeholder="admin@libreria.com"
                                    autoComplete="email"
                                    required
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Contraseña
                                </label>
                                <FiLock className="w-4 h-4 mb-2 text-muted-foreground" />
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={form.manejarCambio}
                                    placeholder="Ingresa tu contraseña"
                                    autoComplete="current-password"
                                    required
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-60"
                            >
                                Iniciar sesión
                            </button>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}