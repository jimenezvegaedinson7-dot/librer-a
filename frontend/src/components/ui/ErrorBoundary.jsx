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
                <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
                    <div className="w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-8 text-center shadow-sm">
                        <div className="text-4xl">!</div>
                        <h1 className="mt-3 text-lg font-bold text-slate-900">Algo salió mal</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            Ocurrió un error inesperado en la aplicación.
                        </p>
                        {this.state.mensaje && (
                            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">{this.state.mensaje}</p>
                        )}
                        <button
                            type="button"
                            onClick={this.reiniciar}
                            className="mt-5 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            Recargar aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}