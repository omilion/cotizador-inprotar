import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, QuoteInfo, UnitType, ProductData } from '../types';

interface QuoteContextType {
    products: Product[];
    info: QuoteInfo;
    currentStep: number;
    addProduct: (product: Product) => void;
    removeProduct: (id: string) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    setProducts: (products: Product[]) => void;
    setInfo: (info: QuoteInfo) => void;
    updateInfo: (updates: Partial<QuoteInfo>) => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: number) => void;
    resetQuote: () => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export const useQuote = () => {
    const context = useContext(QuoteContext);
    if (!context) {
        throw new Error('useQuote must be used within a QuoteProvider');
    }
    return context;
};

const IVA_RATE = 0.19;

const initialInfo: QuoteInfo = {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    customerRut: '',
    customerGiro: '',
    quoteNumber: '', // Will be generated on reset/init
    date: new Date().toLocaleDateString('es-CL'),
    ivaRate: IVA_RATE
};

export const QuoteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [info, setInfoState] = useState<QuoteInfo>({
        ...initialInfo,
        quoteNumber: `COT-${Math.floor(1000 + Math.random() * 9000)}`
    });
    const [currentStep, setCurrentStep] = useState(1);

    const addProduct = (product: Product) => {
        setProducts(prev => [...prev, product]);
    };

    const removeProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const updateProduct = (id: string, updates: Partial<Product>) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const setProductsHandler = (newProducts: Product[]) => {
        setProducts(newProducts);
    }

    const setInfo = (newInfo: QuoteInfo) => {
        setInfoState(newInfo);
    };

    const updateInfo = (updates: Partial<QuoteInfo>) => {
        setInfoState(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    const goToStep = (step: number) => setCurrentStep(step);

    const resetQuote = () => {
        setProducts([]);
        setInfoState({
            ...initialInfo,
            quoteNumber: `COT-${Math.floor(1000 + Math.random() * 9000)}`
        });
        setCurrentStep(1);
    };

    return (
        <QuoteContext.Provider value={{
            products,
            info,
            currentStep,
            addProduct,
            removeProduct,
            updateProduct,
            setProducts: setProductsHandler,
            setInfo,
            updateInfo,
            nextStep,
            prevStep,
            goToStep,
            resetQuote
        }}>
            {children}
        </QuoteContext.Provider>
    );
};
