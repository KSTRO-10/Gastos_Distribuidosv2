import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Navigate } from 'react-router-dom'

// Componente SVG decorativo - Gráfica de barras
function BarChart() {
    return (
        <svg viewBox="0 0 200 120" className="chart-svg" aria-hidden="true">
            <defs>
                <linearGradient id="barGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
                <linearGradient id="barGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
            </defs>
            <rect x="10" y="60" width="25" height="50" rx="4" fill="url(#barGradient1)" opacity="0.9">
                <animate attributeName="height" from="0" to="50" dur="1s" fill="freeze" />
                <animate attributeName="y" from="110" to="60" dur="1s" fill="freeze" />
            </rect>
            <rect x="45" y="30" width="25" height="80" rx="4" fill="url(#barGradient2)" opacity="0.9">
                <animate attributeName="height" from="0" to="80" dur="1s" begin="0.1s" fill="freeze" />
                <animate attributeName="y" from="110" to="30" dur="1s" begin="0.1s" fill="freeze" />
            </rect>
            <rect x="80" y="45" width="25" height="65" rx="4" fill="url(#barGradient1)" opacity="0.9">
                <animate attributeName="height" from="0" to="65" dur="1s" begin="0.2s" fill="freeze" />
                <animate attributeName="y" from="110" to="45" dur="1s" begin="0.2s" fill="freeze" />
            </rect>
            <rect x="115" y="20" width="25" height="90" rx="4" fill="url(#barGradient2)" opacity="0.9">
                <animate attributeName="height" from="0" to="90" dur="1s" begin="0.3s" fill="freeze" />
                <animate attributeName="y" from="110" to="20" dur="1s" begin="0.3s" fill="freeze" />
            </rect>
            <rect x="150" y="35" width="25" height="75" rx="4" fill="url(#barGradient1)" opacity="0.9">
                <animate attributeName="height" from="0" to="75" dur="1s" begin="0.4s" fill="freeze" />
                <animate attributeName="y" from="110" to="35" dur="1s" begin="0.4s" fill="freeze" />
            </rect>
        </svg>
    )
}

// Componente SVG decorativo - Gráfica de dona
function DonutChart() {
    const radius = 40
    const circumference = 2 * Math.PI * radius
    const segments = [
        { percent: 35, color: '#6366f1' },
        { percent: 25, color: '#818cf8' },
        { percent: 20, color: '#a5b4fc' },
        { percent: 20, color: '#c7d2fe' },
    ]

    let offset = 0

    return (
        <svg viewBox="0 0 120 120" className="chart-svg" aria-hidden="true">
            <circle cx="60" cy="60" r="40" fill="none" stroke="#e2e8f0" strokeWidth="15" />
            {segments.map((segment, i) => {
                const dash = (segment.percent / 100) * circumference
                const currentOffset = offset
                offset += dash
                return (
                    <circle
                        key={i}
                        cx="60"
                        cy="60"
                        r="40"
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="15"
                        strokeDasharray={`${dash} ${circumference}`}
                        strokeDashoffset={-currentOffset}
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dasharray 1s ease-out' }}
                    >
                        <animate
                            attributeName="stroke-dasharray"
                            from={`0 ${circumference}`}
                            to={`${dash} ${circumference}`}
                            dur="1s"
                            begin={`${i * 0.15}s`}
                            fill="freeze"
                        />
                    </circle>
                )
            })}
            <circle cx="60" cy="60" r="25" fill="white" />
        </svg>
    )
}

// Componente SVG decorativo - Gráfica de línea
function LineChart() {
    return (
        <svg viewBox="0 0 200 100" className="chart-svg" aria-hidden="true">
            <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d="M10,80 L40,60 L70,70 L100,40 L130,50 L160,25 L190,35"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <animate
                    attributeName="stroke-dasharray"
                    from="0 1000"
                    to="500 0"
                    dur="1.5s"
                    fill="freeze"
                />
            </path>
            <path
                d="M10,80 L40,60 L70,70 L100,40 L130,50 L160,25 L190,35 L190,100 L10,100 Z"
                fill="url(#lineGradient)"
                opacity="0"
            >
                <animate attributeName="opacity" from="0" to="1" dur="1s" begin="0.5s" fill="freeze" />
            </path>
            {[{ x: 10, y: 80 }, { x: 40, y: 60 }, { x: 70, y: 70 }, { x: 100, y: 40 }, { x: 130, y: 50 }, { x: 160, y: 25 }, { x: 190, y: 35 }].map((point, i) => (
                <circle key={i} cx={point.x} cy={point.y} r="4" fill="#6366f1">
                    <animate attributeName="r" from="0" to="4" dur="0.3s" begin={`${0.2 + i * 0.1}s`} fill="freeze" />
                </circle>
            ))}
        </svg>
    )
}

export default function LandingPage() {
    const { isAuthenticated, user } = useAuthStore()

    // Si ya está autenticado, redirigir al dashboard o portal según rol
    if (isAuthenticated) {
        const redirectTo = user?.role === 'proveedor' ? '/portal' : '/dashboard'
        return <Navigate to={redirectTo} replace />
    }

    return (
        <div className="landing-page">
            {/* Header con botón de login */}
            <header className="landing-header">
                <div className="landing-header-content">
                    <div className="landing-logo">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-icon">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="logo-text">Gastos Distribuidos</span>
                    </div>
                    <Link to="/login" className="login-button">
                        Iniciar Sesión
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Sistema de Gestión de
                        <span className="hero-title-highlight"> Gastos Distribuidos</span>
                    </h1>
                    <p className="hero-description">
                        Plataforma integral para el control y distribución de gastos empresariales.
                        Gestiona solicitudes, cotizaciones, órdenes de compra, inventario y facturación
                        de manera eficiente y transparente.
                    </p>
                    <Link to="/login" className="hero-cta">
                        Comenzar Ahora
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
                <div className="hero-charts">
                    <div className="chart-card chart-card-1">
                        <BarChart />
                        <span className="chart-label">Gastos por Área</span>
                    </div>
                    <div className="chart-card chart-card-2">
                        <DonutChart />
                        <span className="chart-label">Distribución</span>
                    </div>
                    <div className="chart-card chart-card-3">
                        <LineChart />
                        <span className="chart-label">Tendencia Mensual</span>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="landing-features">
                <h2 className="features-title">Funcionalidades Principales</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon feature-icon-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                        </div>
                        <h3 className="feature-title">Solicitudes de Compra</h3>
                        <p className="feature-description">
                            Las áreas crean solicitudes de materiales y servicios que son gestionadas por el equipo de adquisiciones.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon feature-icon-purple">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />
                            </svg>
                        </div>
                        <h3 className="feature-title">Cotizaciones</h3>
                        <p className="feature-description">
                            Sistema de cotizaciones con múltiples proveedores para obtener las mejores ofertas del mercado.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon feature-icon-green">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                        </div>
                        <h3 className="feature-title">Órdenes de Compra</h3>
                        <p className="feature-description">
                            Generación y seguimiento de órdenes de compra con control de entregas y pagos.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon feature-icon-orange">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                        </div>
                        <h3 className="feature-title">Control de Inventario</h3>
                        <p className="feature-description">
                            Registro de entregas de proveedores y distribución de materiales a las diferentes áreas.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon feature-icon-red">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </div>
                        <h3 className="feature-title">Gestión de Facturas</h3>
                        <p className="feature-description">
                            Procesamiento de facturas con distribución automática de gastos entre áreas beneficiadas.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon feature-icon-teal">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className="feature-title">Portal de Proveedores</h3>
                        <p className="feature-description">
                            Acceso dedicado para proveedores donde pueden enviar cotizaciones y dar seguimiento a sus órdenes.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>&copy; {new Date().getFullYear()} Sistema de Gastos Distribuidos. Todos los derechos reservados.</p>
            </footer>

            <style>{`
        .landing-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        /* Header */
        .landing-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          z-index: 100;
        }

        .landing-header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .landing-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          color: #6366f1;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .login-button {
          padding: 0.625rem 1.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          font-weight: 600;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Hero */
        .landing-hero {
          padding: 8rem 2rem 4rem;
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          min-height: 90vh;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }

        .hero-title-highlight {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 1.125rem;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 2rem;
        }

        .hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          font-weight: 600;
          font-size: 1.125rem;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .hero-cta:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
        }

        .hero-charts {
          position: relative;
          height: 400px;
        }

        .chart-card {
          position: absolute;
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          transition: transform 0.3s ease;
        }

        .chart-card:hover {
          transform: translateY(-5px);
        }

        .chart-card-1 {
          top: 0;
          left: 0;
          width: 220px;
        }

        .chart-card-2 {
          top: 50px;
          right: 0;
          width: 180px;
        }

        .chart-card-3 {
          bottom: 0;
          left: 40px;
          width: 250px;
        }

        .chart-svg {
          width: 100%;
          height: auto;
          max-height: 120px;
        }

        .chart-label {
          margin-top: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #64748b;
        }

        /* Features */
        .landing-features {
          padding: 4rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .features-title {
          text-align: center;
          font-size: 2.25rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 3rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .feature-card {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .feature-icon-blue { background: #dbeafe; color: #2563eb; }
        .feature-icon-purple { background: #ede9fe; color: #7c3aed; }
        .feature-icon-green { background: #dcfce7; color: #16a34a; }
        .feature-icon-orange { background: #ffedd5; color: #ea580c; }
        .feature-icon-red { background: #fee2e2; color: #dc2626; }
        .feature-icon-teal { background: #ccfbf1; color: #0d9488; }

        .feature-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .feature-description {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.6;
        }

        /* Footer */
        .landing-footer {
          text-align: center;
          padding: 2rem;
          color: #64748b;
          font-size: 0.875rem;
          border-top: 1px solid #e2e8f0;
          margin-top: 2rem;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .landing-hero {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .hero-charts {
            display: none;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .hero-title {
            font-size: 2rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .landing-header-content {
            padding: 1rem;
          }
        }
      `}</style>
        </div>
    )
}
