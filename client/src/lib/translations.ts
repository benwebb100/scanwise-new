export type Language = 'en' | 'bg';

export interface Translations {
  // Navigation & General
  nav: {
    dashboard: string;
    createReport: string;
    settings: string;
    logout: string;
  };
  
  // Common terms
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    remove: string;
    upload: string;
    download: string;
    next: string;
    previous: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
  };
  
  // Create Report Page
  createReport: {
    title: string;
    uploadXray: string;
    patientName: string;
    patientNamePlaceholder: string;
    generateReport: string;
    analyzing: string;
    processingImage: string;
    dentalFindings: string;
    addFinding: string;
    tooth: string;
    condition: string;
    treatment: string;
    price: string;
    selectTooth: string;
    selectCondition: string;
    selectTreatment: string;
    clinicalObservations: string;
    clinicalObservationsPlaceholder: string;
    showTreatmentPricing: string;
    toothMappingAccuracy: string;
    treatmentOptions: string;
    treatmentOptionsTooltip: string;
    treatmentOptionsTooltipEnabled: string;
    toothUncertain: string;
  };
  
  // AI Analysis
  aiAnalysis: {
    title: string;
    subtitle: string;
    activeConditions: string;
    existingDentalWork: string;
    showExistingWork: string;
    showClinicalAssessment: string;
    addAll: string;
    addFinding: string;
    added: string;
    mapTeeth: string;
    mapping: string;
    mappingComplete: string;
    mappingFailed: string;
    noConditions: string;
    noExistingWork: string;
    highConfidence: string;
    confidence: string;
    annotatedXray: string;
    clinicalAssessment: string;
    location: string;
    description: string;
    affectedAreas: string;
    clinicalSignificance: string;
    recommendedAction: string;
  };
  
  // Dental Conditions (Bulgarian translations)
  conditions: {
    'bone-level': string;
    'caries': string;
    'crown': string;
    'filling': string;
    'fracture': string;
    'impacted-tooth': string;
    'implant': string;
    'missing-tooth': string;
    'missing-teeth-no-distal': string;
    'missing-tooth-between': string;
    'periapical-lesion': string;
    'post': string;
    'root-piece': string;
    'root-canal': string;
    'tissue-level': string;
    'root-fracture': string;
    'crown-fracture': string;
    'tooth-wear': string;
    'attrition': string;
    'abrasion': string;
    'hypoplasia': string;
    'bridge': string;
    'partial-denture': string;
    'complete-denture': string;
    'inlay': string;
    'onlay': string;
    'whitening': string;
    'bonding': string;
    'sealant': string;
  };
  
  // Treatments (Bulgarian translations)
  treatments: {
    'restoration': string;
    'crown': string;
    'bridge': string;
    'implant': string;
    'extraction': string;
    'root-canal': string;
    'filling': string;
    'cleaning': string;
    'scaling': string;
    'whitening': string;
    'bonding': string;
    'veneer': string;
    'denture': string;
    'partial-denture': string;
    'orthodontics': string;
    'surgery': string;
    'monitoring': string;
  };
  
  // Dashboard
  dashboard: {
    title: string;
    welcome: string;
    recentReports: string;
    stats: string;
    totalReports: string;
    thisMonth: string;
    avgProcessing: string;
    successRate: string;
    searchReports: string;
    viewReport: string;
    patientName: string;
    scanDate: string;
    status: string;
    conditions: string;
    noReports: string;
    createNewReport: string;
  };
  
  // Authentication
  auth: {
    login: string;
    register: string;
    email: string;
    password: string;
    confirmPassword: string;
    fullName: string;
    signIn: string;
    signUp: string;
    forgotPassword: string;
    resetPassword: string;
    backToLogin: string;
    createAccount: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    welcomeBack: string;
    loginSuccess: string;
    registerSuccess: string;
    passwordResetSent: string;
    fillAllFields: string;
    passwordsDontMatch: string;
    invalidEmail: string;
    weakPassword: string;
  };

  // Settings
  settings: {
    title: string;
    language: string;
    toothNumbering: string;
    clinicSettings: string;
    profile: string;
    notifications: string;
  };
  
  // Toast messages
  toast: {
    success: string;
    error: string;
    warning: string;
    info: string;
    findingsAdded: string;
    noNewFindings: string;
    allConditionsAdded: string;
    languageChanged: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      dashboard: "Dashboard",
      createReport: "Create Report",
      settings: "Settings",
      logout: "Logout",
    },
    common: {
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      remove: "Remove",
      upload: "Upload",
      download: "Download",
      next: "Next",
      previous: "Previous",
      close: "Close",
      confirm: "Confirm",
      yes: "Yes",
      no: "No",
    },
    createReport: {
      title: "Create Dental Report",
      uploadXray: "Upload X-ray",
      patientName: "Patient Name",
      patientNamePlaceholder: "Enter patient name",
      generateReport: "Generate Report",
      analyzing: "Analyzing...",
      processingImage: "Processing image...",
      dentalFindings: "Dental Findings",
      addFinding: "Add Finding",
      tooth: "Tooth",
      condition: "Condition",
      treatment: "Treatment",
      price: "Price",
      selectTooth: "Select tooth",
      selectCondition: "Select condition",
      selectTreatment: "Select treatment",
      clinicalObservations: "Clinical Observations",
      clinicalObservationsPlaceholder: "Enter your observations about the patient's dental condition, symptoms, medical history, etc.",
      showTreatmentPricing: "Show treatment pricing",
      toothMappingAccuracy: "Tooth mapping accuracy improves when R/L markers are visible on the image.",
      treatmentOptions: "Treatment Options",
      treatmentOptionsTooltip: "Click to include a side-by-side comparison (implant, bridge, partial denture) with benefits, trade-offs, typical recovery, and your clinic's pricing in the report.",
      treatmentOptionsTooltipEnabled: "Treatment comparison will be included in the report. Click to disable.",
      toothUncertain: "Tooth: Uncertain",
    },
    aiAnalysis: {
      title: "AI Analysis Results",
      subtitle: "Review AI-detected findings to assist with your clinical assessment",
      activeConditions: "Active Conditions",
      existingDentalWork: "Existing Dental Work",
      showExistingWork: "Show existing dental work",
      showClinicalAssessment: "Show AI clinical assessment",
      addAll: "Add All",
      addFinding: "Add Finding",
      added: "Added",
      mapTeeth: "Map Teeth",
      mapping: "Mapping...",
      mappingComplete: "Tooth Mapping Complete",
      mappingFailed: "Mapping Failed",
      noConditions: "No active conditions detected",
      noExistingWork: "No existing dental work detected",
      highConfidence: "high confidence",
      confidence: "Confidence",
      annotatedXray: "Annotated X-Ray Image",
      clinicalAssessment: "Clinical Assessment",
      location: "Location",
      description: "Description",
      affectedAreas: "Affected Areas",
      clinicalSignificance: "Clinical Significance",
      recommendedAction: "Recommended Action",
    },
    conditions: {
      'bone-level': "Bone Level",
      'caries': "Caries",
      'crown': "Crown",
      'filling': "Filling",
      'fracture': "Fracture",
      'impacted-tooth': "Impacted Tooth",
      'implant': "Implant",
      'missing-tooth': "Missing Tooth",
      'missing-teeth-no-distal': "Missing Teeth No Distal",
      'missing-tooth-between': "Missing Tooth Between",
      'periapical-lesion': "Periapical Lesion",
      'post': "Post",
      'root-piece': "Root Piece",
      'root-canal': "Root Canal",
      'tissue-level': "Tissue Level",
      'root-fracture': "Root Fracture",
      'crown-fracture': "Crown Fracture",
      'tooth-wear': "Tooth Wear",
      'attrition': "Attrition",
      'abrasion': "Abrasion",
      'hypoplasia': "Hypoplasia",
      'bridge': "Bridge",
      'partial-denture': "Partial Denture",
      'complete-denture': "Complete Denture",
      'inlay': "Inlay",
      'onlay': "Onlay",
      'whitening': "Whitening",
      'bonding': "Bonding",
      'sealant': "Sealant",
    },
    treatments: {
      'restoration': "Restoration",
      'crown': "Crown",
      'bridge': "Bridge",
      'implant': "Implant",
      'extraction': "Extraction",
      'root-canal': "Root Canal",
      'filling': "Filling",
      'cleaning': "Cleaning",
      'scaling': "Scaling",
      'whitening': "Whitening",
      'bonding': "Bonding",
      'veneer': "Veneer",
      'denture': "Denture",
      'partial-denture': "Partial Denture",
      'orthodontics': "Orthodontics",
      'surgery': "Surgery",
      'monitoring': "Monitoring",
    },
    dashboard: {
      title: "Dashboard",
      welcome: "Welcome back",
      recentReports: "Recent Reports",
      stats: "Statistics",
      totalReports: "Total Reports",
      thisMonth: "This Month",
      avgProcessing: "Avg Processing",
      successRate: "Success Rate",
      searchReports: "Search reports...",
      viewReport: "View Report",
      patientName: "Patient Name",
      scanDate: "Scan Date",
      status: "Status",
      conditions: "Conditions",
      noReports: "No reports found",
      createNewReport: "Create New Report",
    },
    auth: {
      login: "Login",
      register: "Register",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm Password",
      fullName: "Full Name",
      signIn: "Sign In",
      signUp: "Sign Up",
      forgotPassword: "Forgot Password?",
      resetPassword: "Reset Password",
      backToLogin: "Back to Login",
      createAccount: "Create Account",
      alreadyHaveAccount: "Already have an account?",
      dontHaveAccount: "Don't have an account?",
      welcomeBack: "Welcome back!",
      loginSuccess: "Successfully logged in to Scanwise.",
      registerSuccess: "Account created successfully! Please check your email to verify your account.",
      passwordResetSent: "Password reset email sent! Check your inbox.",
      fillAllFields: "Please fill in all fields",
      passwordsDontMatch: "Passwords don't match",
      invalidEmail: "Please enter a valid email address",
      weakPassword: "Password must be at least 6 characters long",
    },
    settings: {
      title: "Settings",
      language: "Language",
      toothNumbering: "Tooth Numbering System",
      clinicSettings: "Clinic Settings",
      profile: "Profile",
      notifications: "Notifications",
    },
    toast: {
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Info",
      findingsAdded: "findings added to dental findings",
      noNewFindings: "All conditions have already been added to dental findings",
      allConditionsAdded: "All active conditions added to dental findings",
      languageChanged: "Language changed successfully",
    },
  },
  bg: {
    nav: {
      dashboard: "Табло",
      createReport: "Създай Доклад",
      settings: "Настройки",
      logout: "Изход",
    },
    common: {
      loading: "Зареждане...",
      save: "Запази",
      cancel: "Отказ",
      delete: "Изтрий",
      edit: "Редактирай",
      add: "Добави",
      remove: "Премахни",
      upload: "Качи",
      download: "Свали",
      next: "Напред",
      previous: "Назад",
      close: "Затвори",
      confirm: "Потвърди",
      yes: "Да",
      no: "Не",
    },
    createReport: {
      title: "Създай Дентален Доклад",
      uploadXray: "Качи Рентген",
      patientName: "Име на Пациент",
      patientNamePlaceholder: "Въведи име на пациент",
      generateReport: "Генерирай Доклад",
      analyzing: "Анализирам...",
      processingImage: "Обработвам изображение...",
      dentalFindings: "Дентални Находки",
      addFinding: "Добави Находка",
      tooth: "Зъб",
      condition: "Състояние",
      treatment: "Лечение",
      price: "Цена",
      selectTooth: "Избери зъб",
      selectCondition: "Избери състояние",
      selectTreatment: "Избери лечение",
      clinicalObservations: "Клинични Наблюдения",
      clinicalObservationsPlaceholder: "Въведи наблюденията си за денталното състояние на пациента, симптоми, медицинска история и др.",
      showTreatmentPricing: "Покажи цени на лечение",
      toothMappingAccuracy: "Точността на картографирането на зъбите се подобрява когато R/L маркерите са видими на изображението.",
      treatmentOptions: "Опции за Лечение",
      treatmentOptionsTooltip: "Щракни за да включиш сравнение един до друг (имплант, мост, частична протеза) с предимства, компромиси, типично възстановяване и цените на твоята клиника в доклада.",
      treatmentOptionsTooltipEnabled: "Сравнението на лечението ще бъде включено в доклада. Щракни за да изключиш.",
      toothUncertain: "Зъб: Несигурен",
    },
    aiAnalysis: {
      title: "Резултати от AI Анализ",
      subtitle: "Прегледай открити от AI находки за да подпомогнеш клиничната си оценка",
      activeConditions: "Активни Състояния",
      existingDentalWork: "Съществуваща Дентална Работа",
      showExistingWork: "Покажи съществуваща дентална работа",
      showClinicalAssessment: "Покажи AI клинична оценка",
      addAll: "Добави Всички",
      addFinding: "Добави Находка",
      added: "Добавено",
      mapTeeth: "Картографирай Зъби",
      mapping: "Картографирам...",
      mappingComplete: "Картографирането на Зъбите Завършено",
      mappingFailed: "Картографирането Неуспешно",
      noConditions: "Няма открити активни състояния",
      noExistingWork: "Няма открита съществуваща дентална работа",
      highConfidence: "висока увереност",
      confidence: "Увереност",
      annotatedXray: "Анотирано Рентгеново Изображение",
      clinicalAssessment: "Клинична Оценка",
      location: "Местоположение",
      description: "Описание",
      affectedAreas: "Засегнати Области",
      clinicalSignificance: "Клинично Значение",
      recommendedAction: "Препоръчано Действие",
    },
    conditions: {
      'bone-level': "Костно Ниво",
      'caries': "Кариес",
      'crown': "Корона",
      'filling': "Пломба",
      'fracture': "Фрактура",
      'impacted-tooth': "Импактиран Зъб",
      'implant': "Имплант",
      'missing-tooth': "Липсващ Зъб",
      'missing-teeth-no-distal': "Липсващи Зъби Без Дистален",
      'missing-tooth-between': "Липсващ Зъб Между",
      'periapical-lesion': "Периапикална Лезия",
      'post': "Пост",
      'root-piece': "Корен Фрагмент",
      'root-canal': "Ендодонтия",
      'tissue-level': "Тъканно Ниво",
      'root-fracture': "Фрактура на Корен",
      'crown-fracture': "Фрактура на Корона",
      'tooth-wear': "Износване на Зъб",
      'attrition': "Атрицион",
      'abrasion': "Абразия",
      'hypoplasia': "Хипоплазия",
      'bridge': "Мост",
      'partial-denture': "Частична Протеза",
      'complete-denture': "Пълна Протеза",
      'inlay': "Инлей",
      'onlay': "Онлей",
      'whitening': "Избелване",
      'bonding': "Бондинг",
      'sealant': "Силант",
    },
    treatments: {
      'restoration': "Възстановяване",
      'crown': "Корона",
      'bridge': "Мост",
      'implant': "Имплант",
      'extraction': "Екстракция",
      'root-canal': "Ендодонтия",
      'filling': "Пломба",
      'cleaning': "Почистване",
      'scaling': "Скалинг",
      'whitening': "Избелване",
      'bonding': "Бондинг",
      'veneer': "Фасета",
      'denture': "Протеза",
      'partial-denture': "Частична Протеза",
      'orthodontics': "Ортодонтия",
      'surgery': "Хирургия",
      'monitoring': "Наблюдение",
    },
    dashboard: {
      title: "Табло",
      welcome: "Добре дошли обратно",
      recentReports: "Последни Доклади",
      stats: "Статистики",
      totalReports: "Общо Доклади",
      thisMonth: "Този Месец",
      avgProcessing: "Средна Обработка",
      successRate: "Процент Успех",
      searchReports: "Търси доклади...",
      viewReport: "Преглед на Доклад",
      patientName: "Име на Пациент",
      scanDate: "Дата на Скениране",
      status: "Статус",
      conditions: "Състояния",
      noReports: "Няма намерени доклади",
      createNewReport: "Създай Нов Доклад",
    },
    auth: {
      login: "Вход",
      register: "Регистрация",
      email: "Имейл",
      password: "Парола",
      confirmPassword: "Потвърди Парола",
      fullName: "Пълно Име",
      signIn: "Влез",
      signUp: "Регистрирай се",
      forgotPassword: "Забравена парола?",
      resetPassword: "Нулиране на Парола",
      backToLogin: "Обратно към Вход",
      createAccount: "Създай Акаунт",
      alreadyHaveAccount: "Вече имате акаунт?",
      dontHaveAccount: "Нямате акаунт?",
      welcomeBack: "Добре дошли обратно!",
      loginSuccess: "Успешно влизане в Scanwise.",
      registerSuccess: "Акаунтът е създаден успешно! Моля проверете имейла си за потвърждение.",
      passwordResetSent: "Имейл за нулиране на парола е изпратен! Проверете пощата си.",
      fillAllFields: "Моля попълнете всички полета",
      passwordsDontMatch: "Паролите не съвпадат",
      invalidEmail: "Моля въведете валиден имейл адрес",
      weakPassword: "Паролата трябва да бъде поне 6 символа",
    },
    settings: {
      title: "Настройки",
      language: "Език",
      toothNumbering: "Система за Номериране на Зъби",
      clinicSettings: "Настройки на Клиника",
      profile: "Профил",
      notifications: "Известия",
    },
    toast: {
      success: "Успех",
      error: "Грешка",
      warning: "Предупреждение",
      info: "Информация",
      findingsAdded: "находки добавени към денталните находки",
      noNewFindings: "Всички състояния вече са добавени към денталните находки",
      allConditionsAdded: "Всички активни състояния добавени към денталните находки",
      languageChanged: "Езикът е променен успешно",
    },
  },
};

export function getTranslation(language: Language): Translations {
  return translations[language] || translations.en;
}
