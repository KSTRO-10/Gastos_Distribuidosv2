import { Outlet, Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Componente SVG decorativo - Gráfica de barras animada
function FloatingBarChart() {
  return (
    <svg viewBox="0 0 200 120" className="floating-chart" aria-hidden="true">
      <defs>
        <linearGradient id="authBarGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="authBarGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="10" y="60" width="25" height="50" rx="4" fill="url(#authBarGradient1)" opacity="0.9">
        <animate attributeName="height" values="50;60;50" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y" values="60;50;60" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="45" y="30" width="25" height="80" rx="4" fill="url(#authBarGradient2)" opacity="0.9">
        <animate attributeName="height" values="80;70;80" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="y" values="30;40;30" dur="2.5s" repeatCount="indefinite" />
      </rect>
      <rect x="80" y="45" width="25" height="65" rx="4" fill="url(#authBarGradient1)" opacity="0.9">
        <animate attributeName="height" values="65;75;65" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="45;35;45" dur="2.8s" repeatCount="indefinite" />
      </rect>
      <rect x="115" y="20" width="25" height="90" rx="4" fill="url(#authBarGradient2)" opacity="0.9">
        <animate attributeName="height" values="90;80;90" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="y" values="20;30;20" dur="3.2s" repeatCount="indefinite" />
      </rect>
      <rect x="150" y="35" width="25" height="75" rx="4" fill="url(#authBarGradient1)" opacity="0.9">
        <animate attributeName="height" values="75;85;75" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="y" values="35;25;35" dur="2.6s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}

// Componente SVG decorativo - Gráfica de dona animada
function FloatingDonutChart() {
  const radius = 40
  const circumference = 2 * Math.PI * radius

  return (
    <svg viewBox="0 0 120 120" className="floating-chart" aria-hidden="true">
      <circle cx="60" cy="60" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke="#6366f1"
        strokeWidth="12"
        strokeDasharray={`${circumference * 0.65} ${circumference}`}
        transform="rotate(-90 60 60)"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="-90 60 60"
          to="270 60 60"
          dur="8s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="60"
        cy="60"
        r="40"
        fill="none"
        stroke="#a5b4fc"
        strokeWidth="12"
        strokeDasharray={`${circumference * 0.25} ${circumference}`}
        strokeDashoffset={-circumference * 0.65}
        transform="rotate(-90 60 60)"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="-90 60 60"
          to="270 60 60"
          dur="8s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="60" cy="60" r="28" fill="white" />
    </svg>
  )
}

// Partículas flotantes decorativas
function FloatingParticles() {
  return (
    <div className="floating-particles">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${15 + i * 15}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${4 + i * 0.5}s`
          }}
        />
      ))}
    </div>
  )
}

export default function AuthLayout() {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated) {
    const redirectTo = user?.role === 'proveedor' ? '/portal' : '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  return (
    <div className="auth-layout">
      {/* Fondo con gradiente y elementos decorativos */}
      <div className="auth-background">
        <div className="gradient-orb gradient-orb-1"></div>
        <div className="gradient-orb gradient-orb-2"></div>
        <div className="gradient-orb gradient-orb-3"></div>
        <FloatingParticles />
      </div>

      {/* Header con link a landing */}
      <header className="auth-header">
        <Link to="/" className="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="auth-logo-icon">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="auth-logo-text">Gastos Distribuidos</span>
        </Link>
      </header>

      {/* Contenedor principal */}
      <div className="auth-container">
        {/* Panel izquierdo - Decorativo */}
        <div className="auth-side-panel">
          <div className="side-panel-content">
            <h1 className="side-panel-title">
              Gestiona tus gastos de manera
              <span className="title-highlight"> inteligente</span>
            </h1>
            <p className="side-panel-description">
              Control total sobre solicitudes, cotizaciones, órdenes y facturación empresarial.
            </p>

            <div className="floating-charts-container">
              <div className="chart-wrapper chart-wrapper-1">
                <FloatingBarChart />
              </div>
              <div className="chart-wrapper chart-wrapper-2">
                <FloatingDonutChart />
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="auth-form-panel">
          <div className="auth-form-container">
            <Outlet />
          </div>
        </div>
      </div>

      <style>{`
        .auth-layout {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        /* Fondo animado */
        .auth-background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
          z-index: -1;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          animation: float 8s ease-in-out infinite;
        }

        .gradient-orb-1 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          top: -200px;
          right: -100px;
          animation-delay: 0s;
        }

        .gradient-orb-2 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #a5b4fc 0%, #c7d2fe 100%);
          bottom: -150px;
          left: -100px;
          animation-delay: 2s;
        }

        .gradient-orb-3 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
          top: 50%;
          left: 30%;
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        /* Partículas flotantes */
        .floating-particles {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 50%;
          opacity: 0.3;
          animation: rise 6s ease-in-out infinite;
        }

        @keyframes rise {
          0% { 
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { 
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        /* Header */
        .auth-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 1rem 2rem;
          z-index: 100;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          transition: transform 0.2s ease;
        }

        .auth-logo:hover {
          transform: translateX(-3px);
        }

        .auth-logo-icon {
          width: 32px;
          height: 32px;
          color: #6366f1;
        }

        .auth-logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        /* Contenedor principal */
        .auth-container {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* Panel lateral */
        .auth-side-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          position: relative;
        }

        .side-panel-content {
          max-width: 480px;
        }

        .side-panel-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.2;
          margin-bottom: 1rem;
        }

        .title-highlight {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .side-panel-description {
          font-size: 1.125rem;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 2rem;
        }

        /* Gráficas flotantes */
        .floating-charts-container {
          position: relative;
          height: 200px;
          margin-top: 2rem;
        }

        .chart-wrapper {
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .chart-wrapper-1 {
          top: 0;
          left: 0;
          width: 220px;
        }

        .chart-wrapper-2 {
          top: 60px;
          right: 0;
          width: 150px;
        }

        .floating-chart {
          width: 100%;
          height: auto;
        }

        /* Panel del formulario */
        .auth-form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
        }

        .auth-form-container {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .auth-container {
            grid-template-columns: 1fr;
          }

          .auth-side-panel {
            display: none;
          }

          .auth-form-panel {
            padding: 6rem 1.5rem 2rem;
          }
        }

        @media (max-width: 480px) {
          .auth-form-container {
            padding: 2rem 1.5rem;
            border-radius: 20px;
          }
        }
      `}</style>
    </div>
  )
}
