"use client"

import { useRef, useState, useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LandingPage } from "@/components/landing-page"
import { AnalysisStep1 } from "@/components/analysis-step1"
import { AnalysisStep2 } from "@/components/analysis-step2"
import { AnalysisStep3 } from "@/components/analysis-step3"
import { UserDashboard } from "@/components/user-dashboard"
import { PricingPlans } from "@/components/pricing-plans"
import { PaymentPage } from "@/components/payment-page"
import { AdminDashboard } from "@/components/admin-dashboard"
import { SupportModal } from "@/components/support-modal"
import { authService } from '@/lib/services/authService';

// Interfaz para los marcos del usuario
interface Frame {
  id: string
  name: string
  style: string
  description: string
  price: string
  imageUrl: string
  purchaseLink: string
  isActive: boolean
  measurements: {
    width: string
    height: string
    bridge: string
    temple: string
  }
}

export default function OptiScan() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)

  // Estados para el back
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showDownloadProgress, setShowDownloadProgress] = useState(false)
  const [pdfDownloadProgress, setPdfDownloadProgress] = useState(0)

  const [selectedPlan, setSelectedPlan] = useState<{
    name: string
    months: number
    price: number
  } | null>(null)

  const [userData, setUserData] = useState<{
    id: number
    name: string
    lastName: string
    company: string
    email: string
    role: string
    subscription?: {
      plan: "free" | "basic" | "pro" | "enterprise"
      status: "active" | "inactive" | "trial"
      analysisCount: number
      nextBilling?: string
      analysisLimit?: number
    }
  } | null>(null)

  // Estado para los marcos del usuario
  const [userFrames, setUserFrames] = useState<Frame[]>([])

  const [currentStep, setCurrentStep] = useState(1)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [facePosition, setFacePosition] = useState({ x: 50, y: 50 })
  const [scanningAnimation, setScanningAnimation] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [faceAnalysis, setFaceAnalysis] = useState({
    faceShape: "",
    skinTone: "",
    recommendations: [] as Array<{
      name: string
      style: string
      reason: string
      image: string
      confidence: number
      opticalFit?: any
    }>,
    measurements: {
      faceWidth: "",
      faceHeight: "",
      eyeDistance: "",
      eyeHeight: "",
    },
    skinToneDetails: null as any,
  })

  const [browserSupport, setBrowserSupport] = useState({
    hasGetUserMedia: false,
    hasMediaDevices: false,
    browser: "",
    version: "",
  })

  // Función para cargar los marcos del usuario
  const loadUserFrames = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const res = await fetch('/api/user/frames', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        const frames = data.frames.map((frame: any) => ({
          id: String(frame.id),
          name: frame.name,
          style: frame.style,
          description: frame.description,
          price: frame.price,
          imageUrl: frame.imageUrl,
          purchaseLink: frame.purchaseLink,
          isActive: frame.isActive,
          measurements: {
            width: frame.measurements?.width || '',
            height: frame.measurements?.height || '',
            bridge: frame.measurements?.bridge || '',
            temple: frame.measurements?.temple || ''
          }
        }))
        setUserFrames(frames)
      }
    } catch (error) {
      console.error('Error loading user frames:', error)
    }
  }

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.verifySession()
      if (session.success && session.user) {
        setIsLoggedIn(true)
        setIsAdmin(session.user.role === 'admin')
        setUserData(session.user)
        await loadUserFrames() // Cargar los marcos del usuario
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    const detectBrowserSupport = () => {
      const userAgent = navigator.userAgent
      let browser = "Unknown"
      let version = ""

      if (userAgent.indexOf("Firefox") > -1) {
        browser = "Firefox"
        version = userAgent.match(/Firefox\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("SamsungBrowser") > -1) {
        browser = "Samsung Internet"
        version = userAgent.match(/SamsungBrowser\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
        browser = "Opera"
        version = userAgent.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Trident") > -1) {
        browser = "IE"
        version = userAgent.match(/rv:(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Edge") > -1) {
        browser = "Edge"
        version = userAgent.match(/Edge\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Edg") > -1) {
        browser = "Edge Chromium"
        version = userAgent.match(/Edg\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Chrome") > -1) {
        browser = "Chrome"
        version = userAgent.match(/Chrome\/(\d+)/)?.[1] || ""
      } else if (userAgent.indexOf("Safari") > -1) {
        browser = "Safari"
        version = userAgent.match(/Version\/(\d+)/)?.[1] || ""
      }

      const hasGetUserMedia =
        !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
        !!navigator.getUserMedia ||
        !!navigator.webkitGetUserMedia ||
        !!navigator.mozGetUserMedia

      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

      const support = {
        hasGetUserMedia,
        hasMediaDevices,
        browser,
        version,
      }

      console.log("[v0] Browser support detected:", support)
      setBrowserSupport(support)
    }

    detectBrowserSupport()
  }, [])

  const handleLogin = async (email: string, password: string) => {
    const result = await authService.login({ email, password });
    if (result.success) {
      setIsLoggedIn(true);
      setIsAdmin(result.user?.role === 'admin');
      setUserData(result.user);
      await loadUserFrames(); // Cargar marcos después del login
      setShowLanding(true);
      setShowRegister(false);
    } else {
      alert(result.message || 'Error al iniciar sesión');
    }
  };

  const handleRegister = async (name: string, lastName: string, company: string, email: string, password: string) => {
    const result = await authService.register({ name, lastName, company, email, password });
    if (result.success) {
      setIsLoggedIn(true);
      setIsAdmin(false);
      setUserData(result.user);
      // El usuario nuevo no tiene marcos, no es necesario cargarlos
      setShowLanding(true);
      setShowRegister(false);
    } else {
      alert(result.message || 'Error al registrar usuario');
    }
  };

  const handleLogout = () => {
    authService.logout()
    setIsLoggedIn(false)
    setIsAdmin(false)
    setShowLanding(true)
    setShowDashboard(false)
    setShowPricing(false)
    setShowPayment(false)
    setShowRegister(false)
    setSelectedPlan(null)
    setUserData(null)
    setUserFrames([]) // Limpiar marcos al cerrar sesión
    resetAnalysis()
  }

  const goToLanding = () => {
    setShowLanding(true)
    setShowDashboard(false)
    setShowPricing(false)
    setShowPayment(false)
    resetAnalysis()
  }

  const goToDashboard = () => {
    setShowDashboard(true)
    setShowLanding(false)
    setShowPricing(false)
    setShowPayment(false)
    resetAnalysis()
  }

  const goToPricing = () => {
    setShowPricing(true)
    setShowLanding(false)
    setShowDashboard(false)
    setShowPayment(false)
    resetAnalysis()
  }

  const startAnalysis = () => {
    if (!userData) return

    if (userData.subscription && userData.subscription.analysisLimit) {
      if (userData.subscription.analysisCount >= userData.subscription.analysisLimit) {
        alert(`Has alcanzado el límite de ${userData.subscription.analysisLimit} análisis. Por favor, actualiza tu plan.`)
        goToPricing()
        return
      }
    }

    setShowLanding(false)
    setShowDashboard(false)
    setShowPricing(false)
    setShowPayment(false)
    setCurrentStep(1)
    setAnalysisComplete(false)
    setFaceAnalysis({
      faceShape: "",
      skinTone: "",
      recommendations: [],
      measurements: {
        faceWidth: "",
        faceHeight: "",
        eyeDistance: "",
        eyeHeight: "",
      },
      skinToneDetails: null,
    })
  }

  const handleSelectPlan = (planName: string, months: number, price: number) => {
    setSelectedPlan({
      name: planName,
      months,
      price,
    })
    setShowPricing(false)
    setShowPayment(true)
  }

  const handleBackFromPayment = () => {
    setShowPayment(false)
    setSelectedPlan(null)
    setShowPricing(true)
  }

  const requestCameraPermission = () => {
    setCurrentStep(2)
  }

  const analyzeImage = async () => {
    if (!capturedImage || !userData) return

    setIsAnalyzing(true)
    setScanningAnimation(true)
    setAnalysisProgress(0)

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + Math.random() * 10 + 5, 90))
    }, 300)

    try {
      const response = await fetch('http://localhost:5000/analyze-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage })
      })

      const result = await response.json()
      clearInterval(progressInterval)
      setAnalysisProgress(100)

      if (result.success && result.data) {
        const data = result.data

        const formaData = data.forma_rostro || {}
        const tonoData = data.tono_piel || {}

        const medidasConvertidas = formaData.medidas_convertidas || {}
        const medidasCm = medidasConvertidas.medidas_cm || {}
        const medidasOptometria = medidasConvertidas.medidas_optometria || {}

        const measurements = {
          faceWidth: medidasCm.B_cm ? `${medidasCm.B_cm.toFixed(1)} cm` : 'N/A',
          faceHeight: medidasCm.A_cm ? `${medidasCm.A_cm.toFixed(1)} cm` : 'N/A',
          eyeDistance: medidasOptometria.DIP_cm ? `${medidasOptometria.DIP_cm.toFixed(1)} cm` : 'N/A',
          eyeHeight: medidasOptometria.altura_visual ? `${medidasOptometria.altura_visual} mm` : 'N/A',
        }

        const recomendaciones = (formaData.recomendaciones || []).map((rec: any) => ({
          name: rec.name,
          style: rec.style,
          reason: rec.reason,
          image: rec.image_data || rec.image_url || '/placeholder-frame.jpg',
          confidence: rec.confidence,
          opticalFit: rec.optical_fit
        }))

        setFaceAnalysis({
          faceShape: formaData.forma || 'No detectado',
          skinTone: tonoData.clasificacion?.categoria || 'No detectado',
          recommendations: recomendaciones,
          measurements: measurements,
          skinToneDetails: tonoData,
        })

        setAnalysisComplete(true)
        setCurrentStep(3)

        try {
          const incrementResult = await authService.incrementUserAnalysis(userData.id)
          if (incrementResult.success) {
            console.log("Análisis registrado en BD")
          }
        } catch (error) {
          console.error("Error al registrar análisis:", error)
        }

        setUserData(prev => {
          if (!prev || !prev.subscription) return prev
          return {
            ...prev,
            subscription: {
              ...prev.subscription,
              analysisCount: (prev.subscription.analysisCount || 0) + 1
            }
          }
        })
      } else {
        alert('Error en el análisis: ' + (result.error || 'Error desconocido'))
      }
    } catch (error) {
      console.error('Error conectando con el backend:', error)
      alert('Error de conexión con el servidor')
    } finally {
      setIsAnalyzing(false)
      setScanningAnimation(false)
    }
  }

  const generatePDFReport = async () => {
    if (!capturedImage) return

    setIsGeneratingPDF(true)
    setShowDownloadProgress(true)
    setPdfDownloadProgress(0)

    const progressInterval = setInterval(() => {
      setPdfDownloadProgress(prev => {
        if (prev >= 85) {
          clearInterval(progressInterval)
          return 85
        }
        return prev + 5
      })
    }, 200)

    try {
      const response = await fetch('http://localhost:5001/generate-pdf-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage })
      })

      clearInterval(progressInterval)
      setPdfDownloadProgress(100)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'analisis_facial_optiscan.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Error al generar el PDF')
      }
    } catch (error) {
      console.error('Error en generación de PDF:', error)
      alert('Error de conexión con el servidor de PDF')
    } finally {
      setIsGeneratingPDF(false)
      setShowDownloadProgress(false)
      setPdfDownloadProgress(0)
    }
  }

  const resetAnalysis = () => {
    setCurrentStep(1)
    setAnalysisComplete(false)
    setAnalysisProgress(0)
    setFaceDetected(false)
    setScanningAnimation(false)
    setIsAnalyzing(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setFaceAnalysis({
      faceShape: "",
      skinTone: "",
      recommendations: [],
      measurements: {
        faceWidth: "",
        faceHeight: "",
        eyeDistance: "",
        eyeHeight: "",
      },
      skinToneDetails: null,
    })
  }

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const runCameraDiagnostic = async () => {
    console.log("[v0] === DIAGNÓSTICO DE CÁMARA ===")
    console.log("[v0] User Agent:", navigator.userAgent)
    console.log("[v0] Browser Support:", browserSupport)

    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
        console.log("[v0] Camera Permission:", permission.state)
      } catch (e) {
        console.log("[v0] No se pudo verificar permisos:", e)
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        console.log("[v0] Cámaras disponibles:", videoDevices.length)
        videoDevices.forEach((device, index) => {
          console.log(`[v0] Cámara ${index + 1}:`, {
            label: device.label || "Sin nombre",
            deviceId: device.deviceId,
            groupId: device.groupId,
          })
        })
      } catch (e) {
        console.log("[v0] No se pudo listar dispositivos:", e)
      }
    }

    console.log("[v0] === FIN DIAGNÓSTICO ===")
  }

  useEffect(() => {
    runCameraDiagnostic()
  }, [browserSupport])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleFooterNavigation = (section: string) => {
    if (section === "inicio") {
      goToLanding()
    } else if (section === "analisis") {
      startAnalysis()
    } else if (section === "planes") {
      goToPricing()
    } else if (section === "soporte") {
      setShowSupportModal(true)
    }
  }

  if (isLoggedIn && isAdmin) {
    return <AdminDashboard onLogout={handleLogout} />
  }

  if (!isLoggedIn) {
    return (
      <>
        <Header
          isLoggedIn={isLoggedIn}
          onLogout={handleLogout}
          onLogoClick={goToLanding}
          onDashboard={goToDashboard}
          onPricing={goToPricing}
          userName={userData?.name}
        />
        {showRegister ? (
          <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setShowRegister(true)} />
        )}
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onLogoClick={goToLanding}
        onDashboard={goToDashboard}
        onPricing={goToPricing}
        userName={userData?.name}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {showLanding && <LandingPage onStartAnalysis={startAnalysis} />}

      {!showLanding && !showDashboard && !showPricing && !showPayment && (
        <>
          {currentStep === 1 && <AnalysisStep1 onRequestPermission={requestCameraPermission} />}

          {currentStep === 2 && (
            <AnalysisStep2
              videoRef={videoRef}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
              scanningAnimation={scanningAnimation}
              onAnalyze={analyzeImage}
              capturedImage={capturedImage}
              onImageCapture={setCapturedImage}
            />
          )}

          {currentStep === 3 && (
            <AnalysisStep3
              faceAnalysis={faceAnalysis}
              onNewAnalysis={() => {
                resetAnalysis()
                startAnalysis()
              }}
              onGoToDashboard={goToDashboard}
              userFrames={userFrames} // Se pasan los marcos reales del usuario
              onGeneratePDF={generatePDFReport}
              isGeneratingPDF={isGeneratingPDF}
              showDownloadProgress={showDownloadProgress}
              pdfDownloadProgress={pdfDownloadProgress}
            />
          )}
        </>
      )}

      {showDashboard && userData && (
        <UserDashboard
          userData={userData}
          onStartAnalysis={startAnalysis}
          onGoToPricing={goToPricing}
        />
      )}

      {showPricing && (
        <PricingPlans
          onSelectPlan={handleSelectPlan}
          currentPlan={userData?.subscription?.plan}
        />
      )}

      {showPayment && selectedPlan && (
        <PaymentPage
          selectedPlan={selectedPlan}
          onBack={handleBackFromPayment}
        />
      )}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />

      <Footer onNavigate={handleFooterNavigation} />
    </>
  )
}