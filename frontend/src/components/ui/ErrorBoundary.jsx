import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hayError: false, mensaje: '' };
    }

    static getDerivedStateFromError(error) {
        return { hayError: true, mensaje: error?.message || 'Error inesperado' };
    }

    componentDidCatch(error, info) {
        console.error('Error capturado por ErrorBoundary:', error, info?.componentStack);
    }

    reiniciar = () => {
        this.setState({ hayError: false, mensaje: '' });
    };

    render() {
        if (this.state.hayError) {
            return (
                <main className="flex min-h-screen items-center justify-center bg-[#f6f3ee] p-6">
                    <div role="alert" className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e6e0d7] bg-white text-center shadow-[0_24px_60px_-24px_rgba(28,24,20,0.3)]">
                        <div className="h-1 bg-gradient-to-r from-[#74212c] via-[#b98d3e] to-transparent" aria-hidden="true" />
                        <div className="p-8">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#fecaca] bg-[#fef2f2] text-2xl font-semibold text-[#b91c1c]" aria-hidden="true">
                                !
                            </div>
                            <h1 className="mt-4 font-title text-2xl font-semibold text-[#1c1814]">Algo salió mal</h1>
                            <p className="mt-2 text-sm leading-6 text-[#766d62]">
                                Ocurrió un error inesperado en la aplicación. Puedes recargarla para continuar.
                            </p>
                            {this.state.mensaje && (
                                <p className="mt-4 rounded-lg border border-[#e6e0d7] bg-[#faf8f5] px-3 py-2 text-left font-mono text-xs leading-5 text-[#5c544b]">{this.state.mensaje}</p>
                            )}
                            <button
                                type="button"
                                onClick={this.reiniciar}
                                className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-[#74212c] px-6 text-sm font-semibold text-[#fffaf0] shadow-sm transition hover:bg-[#5c1a23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b98d3e] focus-visible:ring-offset-2"
                            >
                                Recargar aplicación
                            </button>
                        </div>
                    </div>
                </main>
            );
        }

        return this.props.children;
    }
}