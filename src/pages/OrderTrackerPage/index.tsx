import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, ChefHat, Bike, FileCheck } from 'lucide-react';
import './OrderTrackerPage.css';

export default function OrderTrackerPage() {
  const navigate = useNavigate();
  // Simulated steps: 1: Received, 2: Preparing, 3: Out for delivery, 4: Delivered
  const [currentStep, setCurrentStep] = useState(1);

  // Fake timer to simulate order progression for demonstration
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { id: 1, title: 'Pedido Recebido', icon: <FileCheck size={24} />, description: 'A pizzaria confirmou seu pedido' },
    { id: 2, title: 'Preparando', icon: <ChefHat size={24} />, description: 'Sua pizza está no forno' },
    { id: 3, title: 'Saiu para Entrega', icon: <Bike size={24} />, description: 'O motoboy está a caminho' },
    { id: 4, title: 'Entregue', icon: <CheckCircle size={24} />, description: 'Pedido finalizado. Bom apetite!' },
  ];

  return (
    <div className="tracker-page">
      <header className="tracker-header glass-panel">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={24} color="var(--primary)" />
        </button>
        <div className="tracker-header-info">
          <h1>Acompanhar Pedido</h1>
          <span className="order-number">#1492</span>
        </div>
      </header>

      <main className="tracker-content">
        <div className="eta-card glass-panel animate-fade-in">
          <Clock size={32} color="var(--primary)" />
          <div className="eta-info">
            <span className="eta-label">Previsão de Entrega</span>
            <span className="eta-time">20:45 - 21:00</span>
          </div>
        </div>

        <div className="stepper-container">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            
            return (
              <div key={step.id} className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                <div className="step-icon-wrapper">
                  <div className="step-line" />
                  <div className="step-icon">
                    {step.icon}
                  </div>
                </div>
                <div className="step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        {currentStep === 4 && (
          <div className="feedback-section animate-fade-in">
             <button className="reorder-btn" onClick={() => navigate('/')}>Fazer Novo Pedido</button>
          </div>
        )}
      </main>
    </div>
  );
}
