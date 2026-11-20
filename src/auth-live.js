import {mountExcelImport} from './excel-import.js';
import {mountAdminUsers} from './admin-panel.js';
import {uploadImage, validateImage, withImageUrls} from './product-images.js';
import { createClient } from '@supabase/supabase-js';
import { resolveMembership, signIn } from './session.js';
import { createUserWithSetupLink } from './admin-users.js';
import { escapeHtml, formatMoney, formatPricePerKg, formatConverted, fxForm, fxFields } from './catalog-format.js';
import { buyerOrderPrintHtml, buyerWhatsAppText, createBuyerOrderDocx } from './buyer-order.js';
import { hasBuyerOriginMapCoordinates, mountBuyerOriginMap } from './buyer-map.js';

const authFlow = new URLSearchParams(location.hash.slice(1)).get('type')
  || new URLSearchParams(location.search).get('type');
let passwordSetup = authFlow === 'invite' || authFlow === 'recovery';
let passwordSetupReady = false;

const client = createClient('https://otaodwohbksacvbheshd.supabase.co',
  'sb_publishable_w4Qp1zBSckxKE5jfAo1QHg_ejNrt16J', {
    auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: true }
  });

const productFields = 'id,organization_id,sales_channel,sku,name_en,name_ar,category_en,category_ar,origin_country,packaging,net_weight_kg,stock_cartons,price_per_carton,currency,price_term,price_destination,photo_path,photo_status,status,created_at,fx_usd,fx_kwd,fx_date,fx_source';

const text = {
  en: {
    conversionMissing:'USD/KWD conversions unavailable: exchange rates not provided.',fxInvalid:'Provide both exchange rates, date and source, or leave all conversion fields empty.',
    buyerExplorer:'Explore origins',buyerCatalog:'Buy from producers',buyerResale:'Sell to restaurants',buyerCart:'My cart',buyerOrders:'My orders',
    buyerWelcome:'Discover products from around the world',buyerWelcomeSub:'Browse published supplier offers by the products’ stated country of origin.',
    buyerOriginTitle:'Explore product origins',buyerOriginDescription:'Counts show live published products by origin, not supplier locations.',
    buyerCountrySearch:'Search a country…',buyerCountries:'Choose an origin country',buyerFlags:'Flags',buyerMap:'World map',buyerMapFlags:'Map + flags',
    buyerNoOrigins:'No published supplier products with an origin country are available yet.',
    buyerCatalogTitle:'Supplier product catalogue',buyerSearch:'Search products, categories or packaging…',buyerAllCategories:'All categories',
    buyerProducts:'products',buyerStock:'Available stock',buyerOffer:'Supplier offer',buyerPerCarton:'per carton',
    buyerAddCarton:'Add one carton',buyerRemoveCarton:'Remove one carton',buyerCartTitle:'Purchase cart',
    buyerCartHelp:'Review your selected cartons. Cart selections are local to this browser and are not submitted as orders.',
    buyerCartEmpty:'Your cart is empty. Choose live supplier products to begin.',
    buyerCartTotals:'Totals by currency',buyerOrdersUnavailable:'Order submission and order history are not connected yet. No order has been created.',
    buyerAddedToCart:'Added to your cart. The cart count has been updated.',
    buyerRemovedFromCart:'Cart quantity updated.',
    buyerStockLimit:'The selected quantity already reaches the available stock.',
    buyerInvalidCart:'Review stock and prices before preparing the draft.',
    buyerPrepareDraft:'Prepare purchase draft',
    buyerDraftReady:'Draft prepared locally. No order has been submitted.',
    buyerDraftActions:'Draft document and sharing',
    buyerDownloadDocx:'Download Word document (.docx)',
    buyerPrintDraft:'Print draft',
    buyerWhatsapp:'Open WhatsApp to share',
    buyerWhatsAppNote:'WhatsApp opens with a draft message. Choose a recipient and send it yourself; attach the downloaded document manually if needed.',
    buyerDocumentError:'The document could not be generated. Try again.',
    buyerPrintBlocked:'Allow pop-ups to open the print view.',
    buyerPrintError:'The print view could not be opened.',
    buyerDraftStatus:'DRAFT — NOT SUBMITTED — NON-CONTRACTUAL',
    buyerLineTotal:'Line total',
    buyerNetWeight:'Net weight',
    buyerTotalWeight:'Total net weight',
    buyerTerm:'Price term / destination',
    buyerSupplierUnavailable:'Supplier details are not available in buyer access.',
    buyerInvalidPrice:'A valid live price is required before preparing a draft.',
    buyerStockChanged:'The selected quantity exceeds current stock. Reduce it to continue.',
    buyerViewOffers:'Browse supplier offers',buyerResaleIntro:'Manage only your own published resale offers for restaurants.',
    buyerResaleEmpty:'You have no resale offers yet.',buyerRefresh:'Refresh live catalogue',
    buyerCountryFilter:'Showing products originating in',buyerClearCountry:'Show all origins',
    buyerMapUnavailable:'Some origin countries do not have map coordinates; use the country cards to browse every origin.',
    buyerMapNote:'Map tiles © OpenStreetMap contributors. Markers show approximate country origins for published products, not supplier locations.',
    buyerMapTilesError:'Map tiles could not be loaded. Check your connection; country cards remain available.',
    buyerMapLoadError:'The map could not be initialized. Use the country cards to browse origins.',
    buyerCartItemUnavailable:'This product is no longer available in the live catalogue.',remove:'Remove',
    buyerPage:'Page',buyerPrevious:'Previous',buyerNext:'Next',
    openProductForm:'Add a product',closeProductForm:'Close form',pagePrevious:'Previous',pageNext:'Next',productPage:'Page',
    closeDetails:'Close product details',
    productOwner:'Product owner', chooseOwner:'Choose a supplier or buyer / wholesaler', ownerRequired:'Select an active supplier or buyer / wholesaler.', ownerUnknown:'Unassigned business', details:'Details',
    publishProduct:'Publish', publishingProduct:'Publishing…', publishError:'Publication failed. Refresh the catalogue and try again.',
    productImage:'Product image (optional)', imageHint:'JPG, PNG or WebP · Maximum 5 MB', imageInvalid:'Choose a JPG, PNG or WebP image up to 5 MB.', imageUploadError:'Image upload failed. Check storage configuration and try again.', imageUnavailable:'Image unavailable. Refresh the catalogue.', unknownChannel:'Unclassified audience',
    organizationName:'New company name (leave empty for an existing company)', organizationId:'Existing company ID (leave empty for a new company)', salesChannel:'Offer audience', source:'Buyers and wholesalers', resale:'Restaurants',
    title:'Welcome to Fruidges', intro:'Sign in to your professional workspace.',
    email:'Email address', password:'Password', login:'Sign in', busy:'Connecting…',
    logout:'Sign out', preview:'Open the separate demo',
    note:'Development version · Authentication and supplier catalogue connected to Supabase.',
    credentials:'Unable to sign in. Check your details, email confirmation and connection.',
    session:'Your session is no longer valid. Please sign in again.',
    configuration:'Account permissions are not configured or are unavailable. Contact the owner.',
    pending:'Your account has not been assigned an active workspace. Contact the owner.',
    denied:'Access to this workspace is not authorized.',
    network:'Unable to reach the service. Please try again.',
    ready:'Your account has been verified.', refresh:'Check access again',
    local:'You are signed out locally. Server sign-out could not be confirmed.',
    supplier:'Supplier workspace', buyer:'Buyer / Wholesaler workspace',
    buyerRole:'Buyer / Wholesaler', restaurant:'Restaurant workspace',
    admin:'Administrator workspace', catalogTitle:'Product catalogue',
    adminNavigation:'Administrator navigation', adminOverview:'Overview',
    adminRequests:'Access requests', adminAccounts:'Accounts & roles',
    adminProducts:'Products', adminOrders:'Orders', adminAnalytics:'Analytics',
    adminSuppliers:'Suppliers', adminBuyers:'Buyers / Wholesalers',
    adminRestaurants:'Restaurants',
    adminOverviewDescription:'Live catalogue status and the main platform sections.',
    adminLiveNote:'Product counts come from the connected Supabase catalogue. Company directories require the secure admin-organizations function; login emails, requests and orders are not shown here.',
    adminTotalProducts:'Total products', adminSourcePublished:'Published supplier offers',
    adminResalePublished:'Published buyer / wholesaler offers', adminDraftProducts:'Draft products',
    adminQuickAccess:'Workspace sections', adminProductsHint:'Review the live catalogue, offer audience and publication status.',
    adminAccountsHint:'Create an account; the server verifies and assigns its selected role and organization.',
    adminRequestsUnavailable:'Access-request management is not connected yet. No sample requests are shown.',
    adminOrdersUnavailable:'Orders are not connected yet. No sample order data is shown.',
    adminAccountNotice:'Account creation requires the secured admin-create-user function to be deployed and configured. The account list is not connected.',
    adminAnalyticsNote:'Only live product-catalogue counts are available here. User and order metrics are not connected.',
    directoryLoading:'Loading company directory from the secure service…',
    directoryError:'The company directory could not be loaded. Confirm the admin-organizations function and migration 07 are deployed.',
    directoryEmpty:'No companies are currently listed for this role. No sample companies are shown.',
    directoryDescription:'Companies are grouped by their assigned role. Product cards use live catalogue rows; individual login emails are not shown.',
    refreshDirectory:'Refresh list', directoryProducts:'Products from this company',
    directoryProductOwnershipMismatch:'Some catalogue products have an offer audience that does not match this company role. They are omitted here; review them in Products.',
    companyCountry:'Company country', countryNotSet:'Country not provided',
    countryCodeHint:'Enter the two-letter ISO country code, for example TN.',
    saveCountry:'Save country', savingCountry:'Saving…',
    countrySaved:'Company country saved.',
    countrySaveError:'Could not save the country. Verify the code and try again.',
    countryCodeInvalid:'Enter a valid two-letter country code.',
    members:'Accounts', activeMembers:'Active', pendingMembers:'Pending',
    suspendedMembers:'Suspended',
    catalogLoading:'Loading products from Supabase…',
    catalogError:'The catalogue could not be loaded. Please try again.',
    catalogEmpty:'No products are available yet. No sample products are shown.',
    refreshCatalog:'Refresh catalogue', createTitle:'Add a product',
    sku:'SKU', nameEn:'Product name (English)', nameAr:'Product name (Arabic)',
    categoryEn:'Category (English, optional)', categoryAr:'Category (Arabic, optional)',
    origin:'Origin country code (2 letters)', packaging:'Packaging / size',
    weight:'Net weight per carton (kg)', stock:'Available stock (cartons)',
    price:'Price per carton', currency:'Currency', term:'Price term',
    destination:'CIF destination (if known)', draft:'Draft', published:'Published',
    cif:'CIF', fob:'FOB', exw:'EXW', add:'Add product', saving:'Saving…',
    created:'Product saved to Supabase.',     createError:'The product could not be saved. Check the fields and your account permissions.',
    originMissing:'Origin unavailable', carton:'cartons', perKg:'per kg',
    photoMissing:'Photo not provided', destinationMissing:'Destination not specified',
    status:'Status', noStock:'Out of stock',
    manageUsers:'Manage users', userEmail:'User email', userRole:'Role',
    createAccount:'Create account', creatingAccount:'Creating account…',
    accountCreated:'Account created in Supabase.',
    setupLinkLabel:'Password setup link',
    setupLinkNotice:'Copy this private, one-time link and send it directly to the intended user. Its expiry follows Supabase Auth settings.',
    copyLink:'Copy link', linkCopied:'Link copied. Share it privately.',
    copyLinkFallback:'Select the link and copy it manually.',
    createUserError:'Could not create the account or setup link. Please try again.',
    emailExists:'An account with this email already exists.',
    linkRateLimited:'Link creation is temporarily limited. Try again later.',
    adminDenied:'Only an active administrator can create accounts.',
    invalidAccount:'Enter a valid email address and role.',
    setupPassword:'Set your password',
    setupPasswordIntro:'Choose a password to finish setting up your account.',
    newPassword:'New password', confirmPassword:'Confirm password',
    passwordMismatch:'Passwords do not match.', savePassword:'Save password',
    savingPassword:'Saving…', passwordSaved:'Password set. Your workspace is ready.',
    passwordSetupError:'Could not set your password. Check the requirements and try again.',
    preparingInvite:'Checking your invitation…'
  },
  ar: {
    conversionMissing:'تحويلات USD/KWD غير متاحة: أسعار الصرف غير محددة.',fxInvalid:'أدخل سعري الصرف والتاريخ والمصدر أو اترك جميع حقول التحويل فارغة.',
    buyerExplorer:'استكشاف بلدان المنشأ',buyerCatalog:'الشراء من المنتجين',buyerResale:'البيع للمطاعم',buyerCart:'سلتي',buyerOrders:'طلباتي',
    buyerWelcome:'اكتشف منتجات من مختلف أنحاء العالم',buyerWelcomeSub:'تصفح عروض الموردين المنشورة حسب بلد منشأ المنتج المسجل.',
    buyerOriginTitle:'استكشاف منشأ المنتجات',buyerOriginDescription:'الأعداد تمثل المنتجات المنشورة حسب المنشأ، ولا تمثل مواقع الموردين.',
    buyerCountrySearch:'ابحث عن بلد…',buyerCountries:'اختر بلد المنشأ',buyerFlags:'الأعلام',buyerMap:'خريطة العالم',buyerMapFlags:'الخريطة + الأعلام',
    buyerNoOrigins:'لا توجد حالياً منتجات موردين منشورة مع تحديد بلد المنشأ.',
    buyerCatalogTitle:'كتالوج منتجات الموردين',buyerSearch:'ابحث عن منتج أو فئة أو تعبئة…',buyerAllCategories:'جميع الفئات',
    buyerProducts:'منتجات',buyerStock:'المخزون المتاح',buyerOffer:'عرض المورد',buyerPerCarton:'لكل كرتون',
    buyerAddCarton:'أضف كرتوناً',buyerRemoveCarton:'أزل كرتوناً',buyerCartTitle:'سلة الشراء',
    buyerCartHelp:'راجع الكراتين المختارة. السلة محفوظة في هذا المتصفح ولا تُرسل كطلب.',
    buyerCartEmpty:'سلتك فارغة. اختر منتجات الموردين المتاحة للبدء.',
    buyerCartTotals:'الإجماليات حسب العملة',buyerOrdersUnavailable:'إنشاء الطلبات وسجلها غير متصلين بعد. لم يتم إنشاء أي طلب.',
    buyerAddedToCart:'تمت الإضافة إلى السلة وتحديث عدد الكراتين.',
    buyerRemovedFromCart:'تم تحديث كمية السلة.',
    buyerStockLimit:'الكمية المحددة وصلت إلى المخزون المتاح.',
    buyerInvalidCart:'راجع المخزون والأسعار قبل إعداد المسودة.',
    buyerPrepareDraft:'إعداد مسودة شراء',
    buyerDraftReady:'تم إعداد المسودة محلياً. لم يتم إرسال أي طلب.',
    buyerDraftActions:'مستند المسودة ومشاركتها',
    buyerDownloadDocx:'تنزيل مستند Word (.docx)',
    buyerPrintDraft:'طباعة المسودة',
    buyerWhatsapp:'فتح WhatsApp للمشاركة',
    buyerWhatsAppNote:'يفتح WhatsApp رسالة جاهزة. اختر المستلم وأرسلها بنفسك؛ أرفق المستند الذي تم تنزيله يدوياً عند الحاجة.',
    buyerDocumentError:'تعذر إنشاء المستند. حاول مجدداً.',
    buyerPrintBlocked:'اسمح بالنوافذ المنبثقة لفتح صفحة الطباعة.',
    buyerPrintError:'تعذر فتح صفحة الطباعة.',
    buyerDraftStatus:'مسودة — غير مرسلة — غير ملزمة',
    buyerLineTotal:'إجمالي السطر',
    buyerNetWeight:'الوزن الصافي',
    buyerTotalWeight:'إجمالي الوزن الصافي',
    buyerTerm:'شرط السعر / الوجهة',
    buyerSupplierUnavailable:'بيانات المورد غير متاحة ضمن صلاحيات المشتري.',
    buyerInvalidPrice:'يلزم سعر مباشر وصالح لإعداد المسودة.',
    buyerStockChanged:'الكمية المحددة تتجاوز المخزون الحالي. خفّضها للمتابعة.',
    buyerViewOffers:'تصفح عروض الموردين',buyerResaleIntro:'أدر عروض إعادة البيع الخاصة بك للمطاعم فقط.',
    buyerResaleEmpty:'ليس لديك عروض إعادة بيع بعد.',buyerRefresh:'تحديث الكتالوج المباشر',
    buyerCountryFilter:'المنتجات ذات المنشأ في',buyerClearCountry:'عرض جميع بلدان المنشأ',
    buyerMapUnavailable:'لا تتوفر إحداثيات لبعض بلدان المنشأ؛ استخدم بطاقات البلدان لتصفح جميع المناشئ.',
    buyerMapNote:'خرائط OpenStreetMap. تشير العلامات إلى مواقع تقريبية لبلدان منشأ المنتجات المنشورة، ولا تمثل مواقع الموردين.',
    buyerMapTilesError:'تعذر تحميل الخريطة. تحقق من الاتصال؛ وتظل بطاقات البلدان متاحة.',
    buyerMapLoadError:'تعذر تشغيل الخريطة. استخدم بطاقات البلدان لتصفح المناشئ.',
    buyerCartItemUnavailable:'لم يعد هذا المنتج متاحاً في الكتالوج المباشر.',remove:'إزالة',
    buyerPage:'الصفحة',buyerPrevious:'السابق',buyerNext:'التالي',
    openProductForm:'إضافة منتج',closeProductForm:'إغلاق النموذج',pagePrevious:'السابق',pageNext:'التالي',productPage:'الصفحة',
    closeDetails:'إغلاق تفاصيل المنتج',
    productOwner:'الجهة المالكة للمنتج', chooseOwner:'اختر مورداً أو مشترياً / تاجر جملة', ownerRequired:'اختر مورداً أو مشترياً / تاجر جملة نشطاً.', ownerUnknown:'جهة غير محددة', details:'التفاصيل',
    publishProduct:'نشر', publishingProduct:'جارٍ النشر…', publishError:'تعذر النشر. حدّث الكتالوج وحاول مجدداً.',
    productImage:'صورة المنتج (اختياري)', imageHint:'JPG أو PNG أو WebP · الحد الأقصى 5 ميغابايت', imageInvalid:'اختر صورة JPG أو PNG أو WebP لا تتجاوز 5 ميغابايت.', imageUploadError:'تعذر رفع الصورة. تحقق من إعدادات التخزين وحاول مجدداً.', imageUnavailable:'الصورة غير متاحة. حدّث الكتالوج.', unknownChannel:'جمهور غير مصنف',
    organizationName:'اسم الشركة الجديدة (اتركه فارغاً لشركة موجودة)', organizationId:'معرّف الشركة الموجودة (اتركه فارغاً لشركة جديدة)', salesChannel:'الجمهور المستهدف', source:'المشترون وتجار الجملة', resale:'المطاعم',
    title:'مرحباً بك في Fruidges', intro:'سجّل الدخول إلى مساحة عملك المهنية.',
    email:'البريد الإلكتروني', password:'كلمة المرور', login:'تسجيل الدخول',
    busy:'جارٍ الاتصال…', logout:'تسجيل الخروج', preview:'فتح النسخة التجريبية المنفصلة',
    note:'نسخة قيد التطوير · المصادقة وكتالوج المورد متصلان بـ Supabase.',
    credentials:'تعذر تسجيل الدخول. تحقق من بياناتك وتأكيد بريدك الإلكتروني والاتصال.',
    session:'انتهت صلاحية الجلسة. سجّل الدخول مجدداً.',
    configuration:'صلاحيات الحساب غير مهيأة أو غير متاحة. تواصل مع المالك.',
    pending:'لم يتم تعيين مساحة عمل نشطة لحسابك. تواصل مع المالك.',
    denied:'غير مصرح لك بالوصول إلى مساحة العمل.',
    network:'تعذر الاتصال بالخدمة. حاول مجدداً.',
    ready:'تم التحقق من حسابك.', refresh:'التحقق من الوصول مجدداً',
    local:'تم تسجيل الخروج محلياً. تعذر تأكيد تسجيل الخروج من الخادم.',
    supplier:'مساحة المورد', buyer:'مساحة المشتري وتاجر الجملة',
    buyerRole:'المشتري / تاجر الجملة', restaurant:'مساحة المطعم',
    admin:'مساحة المسؤول', catalogTitle:'كتالوج المنتجات',
    adminNavigation:'قائمة المسؤول', adminOverview:'نظرة عامة',
    adminRequests:'طلبات الوصول', adminAccounts:'الحسابات والأدوار',
    adminProducts:'المنتجات', adminOrders:'الطلبات', adminAnalytics:'الإحصاءات',
    adminSuppliers:'الموردون', adminBuyers:'المشترون / تجار الجملة',
    adminRestaurants:'المطاعم',
    adminOverviewDescription:'حالة الكتالوج المباشر والأقسام الرئيسية للمنصة.',
    adminLiveNote:'أعداد المنتجات من كتالوج Supabase المتصل. تتطلب أدلة الشركات دالة admin-organizations الآمنة؛ لا تُعرض عناوين الدخول الفردية، والطلبات غير متصلة بعد.',
    adminTotalProducts:'إجمالي المنتجات', adminSourcePublished:'عروض الموردين المنشورة',
    adminResalePublished:'عروض المشترين / تجار الجملة المنشورة', adminDraftProducts:'المنتجات غير المنشورة',
    adminQuickAccess:'أقسام مساحة العمل', adminProductsHint:'راجع الكتالوج المباشر والجمهور المستهدف وحالة النشر.',
    adminAccountsHint:'أنشئ حساباً؛ يتحقق الخادم من الدور والمؤسسة المختارين ويسندهما.',
    adminRequestsUnavailable:'إدارة طلبات الوصول غير متصلة بعد. لا تُعرض طلبات افتراضية.',
    adminOrdersUnavailable:'الطلبات غير متصلة بعد. لا تُعرض بيانات طلبات افتراضية.',
    adminAccountNotice:'يتطلب إنشاء الحساب نشر دالة admin-create-user الآمنة وتهيئتها. قائمة الحسابات غير متصلة بعد.',
    adminAnalyticsNote:'المتاح هنا هو أعداد المنتجات الفعلية فقط. إحصاءات المستخدمين والطلبات غير متصلة.',
    directoryLoading:'جارٍ تحميل دليل الشركات من الخدمة الآمنة…',
    directoryError:'تعذر تحميل دليل الشركات. تحقق من نشر دالة admin-organizations والترحيل 07.',
    directoryEmpty:'لا توجد شركات مسجلة لهذا الدور حالياً. لا تُعرض شركات افتراضية.',
    directoryDescription:'تُجمع الشركات حسب الدور المعين لها. بطاقات المنتجات مأخوذة من الكتالوج الفعلي؛ لا تُعرض عناوين الدخول الفردية.',
    refreshDirectory:'تحديث القائمة', directoryProducts:'منتجات هذه الشركة',
    directoryProductOwnershipMismatch:'بعض منتجات الكتالوج لها جمهور بيع لا يتوافق مع دور هذه الشركة. لن تُعرض هنا؛ راجعها في قسم المنتجات.',
    companyCountry:'بلد الشركة', countryNotSet:'البلد غير مسجل',
    countryCodeHint:'أدخل رمز البلد المكوّن من حرفين وفق ISO، مثل TN.',
    saveCountry:'حفظ البلد', savingCountry:'جارٍ الحفظ…',
    countrySaved:'تم حفظ بلد الشركة.',
    countrySaveError:'تعذر حفظ البلد. تحقق من الرمز وحاول مجدداً.',
    countryCodeInvalid:'أدخل رمز بلد صالحاً مكوناً من حرفين.',
    members:'الحسابات', activeMembers:'نشط', pendingMembers:'قيد الانتظار',
    suspendedMembers:'موقوف',
    catalogLoading:'جارٍ تحميل المنتجات من Supabase…',
    catalogError:'تعذر تحميل الكتالوج. حاول مجدداً.',
    catalogEmpty:'لا توجد منتجات بعد. لن يتم عرض منتجات تجريبية.',
    refreshCatalog:'تحديث الكتالوج', createTitle:'إضافة منتج',
    sku:'رمز المنتج', nameEn:'اسم المنتج (بالإنجليزية)',
    nameAr:'اسم المنتج (بالعربية)', categoryEn:'الفئة (بالإنجليزية، اختياري)',
    categoryAr:'الفئة (بالعربية، اختياري)', origin:'رمز بلد المنشأ (حرفان)',
    packaging:'التعبئة / الحجم', weight:'الوزن الصافي لكل كرتون (كغ)',
    stock:'المخزون المتاح (كراتين)', price:'السعر لكل كرتون',
    currency:'العملة', term:'شروط السعر',
    destination:'وجهة CIF (إن عُرفت)', draft:'مسودة', published:'منشور',
    cif:'CIF', fob:'FOB', exw:'EXW', add:'إضافة المنتج', saving:'جارٍ الحفظ…',
    created:'تم حفظ المنتج في Supabase.',
    createError:'تعذر حفظ المنتج. تحقق من الحقول وصلاحيات حسابك.',
    originMissing:'بلد المنشأ غير متاح', carton:'كراتين',
    perKg:'لكل كغ', photoMissing:'الصورة غير متوفرة',
    destinationMissing:'الوجهة غير محددة', status:'الحالة',
    noStock:'نفد المخزون',
    manageUsers:'إدارة المستخدمين', userEmail:'البريد الإلكتروني للمستخدم',
    userRole:'الدور', createAccount:'إنشاء حساب', creatingAccount:'جارٍ إنشاء الحساب…',
    accountCreated:'تم إنشاء الحساب في Supabase.',
    setupLinkLabel:'رابط إعداد كلمة المرور',
    setupLinkNotice:'انسخ هذا الرابط الخاص الذي يستخدم مرة واحدة وأرسله مباشرة إلى المستخدم المقصود. تنتهي صلاحيته حسب إعدادات Supabase Auth.',
    copyLink:'نسخ الرابط', linkCopied:'تم نسخ الرابط. أرسله بشكل خاص.',
    copyLinkFallback:'حدد الرابط وانسخه يدوياً.',
    createUserError:'تعذر إنشاء الحساب أو رابط الإعداد. حاول مجدداً.',
    emailExists:'يوجد حساب بهذا البريد الإلكتروني بالفعل.',
    linkRateLimited:'تم تقييد إنشاء الروابط مؤقتاً. حاول لاحقاً.',
    adminDenied:'يمكن للمسؤول النشط فقط إنشاء الحسابات.',
    invalidAccount:'أدخل بريداً إلكترونياً صالحاً ودوراً صحيحاً.',
    setupPassword:'تعيين كلمة المرور',
    setupPasswordIntro:'اختر كلمة مرور لإكمال إعداد حسابك.',
    newPassword:'كلمة المرور الجديدة',
    confirmPassword:'تأكيد كلمة المرور',
    passwordMismatch:'كلمتا المرور غير متطابقتين.',
    savePassword:'حفظ كلمة المرور', savingPassword:'جارٍ الحفظ…',
    passwordSaved:'تم تعيين كلمة المرور. مساحة عملك جاهزة.',
    passwordSetupError:'تعذر تعيين كلمة المرور. تحقق من المتطلبات وحاول مجدداً.',
    preparingInvite:'جارٍ التحقق من الدعوة…'
  }
};

let language = 'en';
let current = null;
let checking = false;
let revision = 0;
let busy = false;
let products = [];
let productsLoading = false;
let productsLoaded = false;
let productsError = '';
let setupLink = '';
let activeAdminView = 'overview';
let productPage=0;
let productFormOpen=false;
let organizations = [];
let directoryLoading = false;
let directoryLoaded = false;
let directoryError = '';
let directorySavingId = '';
let buyerView = 'explore';
let buyerOrigin = '';
let buyerCategory = '';
let buyerSearch = '';
let buyerQuantity = {};
let buyerDraftOrder = null;
let buyerMap = null;
let buyerPage = 0;
let buyerGeoMode = 'mixed';

function clearWorkspace() {
  buyerMap?.remove();
  buyerMap = null;
  products = [];
  productsLoading = false;
  productsLoaded = false;
  productsError = '';
  setupLink = '';
  activeAdminView = 'overview';
  productPage=0;productFormOpen=false;
  organizations = [];
  directoryLoading = false;
  directoryLoaded = false;
  directoryError = '';
  directorySavingId = '';
  buyerView = 'explore';
  buyerOrigin = '';
  buyerCategory = '';
  buyerSearch = '';
  buyerQuantity = {};
  buyerDraftOrder = null;
  buyerPage = 0;
  buyerGeoMode = 'mixed';
}

function membershipContext(account) {
  return account ? [account.user.id, account.membership.organization_id, account.membership.role, account.membership.status].join(':') : '';
}

const root = document.getElementById('root');
const t = key => text[language][key] || text[language].network;

root.addEventListener('click', event => {
  const buyerNav = event.target.closest('[data-buyer-view]');
  if (buyerNav && current?.membership.role === 'buyer') {
    buyerView = buyerNav.dataset.buyerView;
    if (buyerView !== 'cart') buyerPage = 0;
    show();
    return;
  }
  const buyerOriginButton = event.target.closest('[data-buyer-origin]');
  if (buyerOriginButton && current?.membership.role === 'buyer') {
    buyerOrigin = buyerOriginButton.dataset.buyerOrigin;
    buyerView = 'catalog';
    buyerPage = 0;
    show();
    return;
  }
  const buyerMode = event.target.closest('[data-buyer-geo-mode]');
  if (buyerMode && current?.membership.role === 'buyer') {
    buyerGeoMode = buyerMode.dataset.buyerGeoMode;
    show();
    return;
  }
  const clearOrigin = event.target.closest('[data-buyer-clear-origin]');
  if (clearOrigin && current?.membership.role === 'buyer') {
    buyerOrigin = '';
    buyerPage = 0;
    renderBuyerContent();
    return;
  }
  const buyerCategoryButton = event.target.closest('[data-buyer-category]');
  if (buyerCategoryButton && current?.membership.role === 'buyer') {
    buyerCategory = buyerCategoryButton.dataset.buyerCategory;
    buyerPage = 0;
    renderBuyerContent();
    return;
  }
  const buyerPager = event.target.closest('[data-buyer-page]');
  if (buyerPager && current?.membership.role === 'buyer') {
    buyerPage = Number(buyerPager.dataset.buyerPage);
    renderBuyerContent();
    return;
  }
  const prepareBuyerOrder = event.target.closest('[data-buyer-prepare-order]');
  if (prepareBuyerOrder && current?.membership.role === 'buyer') {
    const result = createBuyerDraftOrder();
    if (result.error) {
      buyerDraftOrder = null;
      renderBuyerContent();
      setBuyerStatus(result.error);
      return;
    }
    buyerDraftOrder = result.order;
    buyerView = 'cart';
    renderBuyerContent();
    setBuyerStatus('buyerDraftReady');
    return;
  }
  if (event.target.closest('[data-buyer-download-order]') && current?.membership.role === 'buyer') {
    downloadBuyerDraft();
    return;
  }
  if (event.target.closest('[data-buyer-print-order]') && current?.membership.role === 'buyer') {
    printBuyerDraft();
    return;
  }
  const buyerQuantityButton = event.target.closest('[data-buyer-quantity]');
  if (buyerQuantityButton && current?.membership.role === 'buyer') {
    const id = String(buyerQuantityButton.dataset.buyerQuantity || '');
    const delta = Number(buyerQuantityButton.dataset.buyerDelta);
    if (!id || ![-1,1].includes(delta)) return;
    const quantity = Number(buyerQuantity[id] || 0);
    if (delta > 0) {
      const product = buyerOffers().find(row => String(row.id) === id);
      const stock = Number(product?.stock_cartons);
      if (!product || !Number.isSafeInteger(stock) || stock <= quantity) {
        setBuyerStatus('buyerStockLimit');
        return;
      }
      buyerQuantity[id] = quantity + 1;
    } else {
      const next = Math.max(0, quantity - 1);
      if (next) buyerQuantity[id] = next;
      else delete buyerQuantity[id];
    }
    buyerDraftOrder = null;
    renderBuyerContent();
    setBuyerStatus(delta > 0 ? 'buyerAddedToCart' : 'buyerRemovedFromCart');
    return;
  }
  const removeUnavailable = event.target.closest('[data-buyer-remove-cart]');
  if (removeUnavailable && current?.membership.role === 'buyer') {
    delete buyerQuantity[removeUnavailable.dataset.buyerRemoveCart];
    buyerDraftOrder = null;
    renderBuyerContent();
    setBuyerStatus('buyerRemovedFromCart');
    return;
  }
  const formToggle=event.target.closest('[data-product-form-toggle]');
  if(formToggle && !busy){productFormOpen=!productFormOpen;const body=document.getElementById('product-form-body');if(body)body.hidden=!productFormOpen;formToggle.setAttribute('aria-expanded',String(productFormOpen));formToggle.textContent=t(productFormOpen?'closeProductForm':'openProductForm');return;}
  const pager=event.target.closest('[data-product-page]');
  if(pager){productPage=Number(pager.dataset.productPage);renderCatalog();return;}

  const productRow=event.target.closest('[data-product-details]');
  if(productRow){openProductDetails(productRow.dataset.productDetails,productRow);return;}
  const button = event.target.closest('[data-admin-view]');
  if (!button || busy || !current || current.membership.role !== 'admin') return;
  const view = button.dataset.adminView;
  if (!adminViews.some(([id]) => id === view)) return;
  activeAdminView = view;
  show();
  if (adminDirectoryRole(view) || view === 'products') return loadAdminDirectory();
});
root.addEventListener('input', event => {
  if (current?.membership.role !== 'buyer') return;
  if (event.target.id === 'buyer-country-search') {
    const query = event.target.value.trim().toLocaleLowerCase();
    root.querySelectorAll('[data-country-name]').forEach(card => {
      card.hidden = !card.dataset.countryName.includes(query);
    });
    return;
  }
  if (event.target.id === 'buyer-search') {
    buyerSearch = event.target.value;
    buyerPage = 0;
    const start = event.target.selectionStart;
    renderBuyerContent();
    const input = document.getElementById('buyer-search');
    input?.focus();
    if (input && start !== null) input.setSelectionRange(start, start);
  }
});
root.addEventListener('submit', event => {
  const form = event.target.closest('[data-company-country]');
  if (form) return saveCompanyCountry(event, form);
});

function countryLabel(code) {
  const countryCode = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) return t('originMissing');
  const flag = buyerCountryFlag(countryCode);
  const name = new Intl.DisplayNames([language], { type:'region' }).of(countryCode);
  return `${flag} ${name && name !== countryCode ? name : countryCode}`;
}

function productCard(product, { showAudience = false, showPublish = true } = {}) {
  const name = language === 'ar' ? product.name_ar : product.name_en;
  const category = language === 'ar' ? product.category_ar : product.category_en;
  const destination = product.price_term === 'CIF'
    ? (product.price_destination || t('destinationMissing'))
    : '';
  const stock = Number(product.stock_cartons);
  return `<article class="product-card">
    <div class="product-card__heading">
      <h3>${escapeHtml(name)}</h3>
      <span class="product-status">${escapeHtml(t(product.status))}</span>
    </div>
    <p class="product-meta">${escapeHtml(product.sku)}${category ? ` · ${escapeHtml(category)}` : ''}</p>
    <p>${escapeHtml(countryLabel(product.origin_country))} · ${escapeHtml(product.packaging)}</p>
    <p>${escapeHtml(String(product.net_weight_kg))} kg / ${escapeHtml(t('carton'))}</p>
    <p><strong>${escapeHtml(formatMoney(product.price_per_carton, product.currency))}</strong> / ${escapeHtml(t('carton'))}</p>
    <p>${escapeHtml(formatPricePerKg(product.price_per_carton, product.net_weight_kg, product.currency))}</p>
    ${product.fx_usd && product.fx_kwd ? `<p>${escapeHtml(formatConverted(product.price_per_carton,product.fx_usd,'USD'))} · ${escapeHtml(formatConverted(product.price_per_carton,product.fx_kwd,'KWD'))}</p><p>${escapeHtml(product.fx_date)} · ${escapeHtml(product.fx_source)}</p>` : `<p>${escapeHtml(t('conversionMissing'))}</p>`}
    <p>${escapeHtml(product.price_term)}${destination ? ` · ${escapeHtml(destination)}` : ''}</p>
    ${showAudience ? `<p>${escapeHtml(t('salesChannel'))}: ${escapeHtml(t(product.sales_channel === 'source' || product.sales_channel === 'resale' ? product.sales_channel : 'unknownChannel'))}</p>` : ''}
    <p>${stock > 0 ? `${escapeHtml(String(product.stock_cartons))} ${escapeHtml(t('carton'))}` : escapeHtml(t('noStock'))}</p>
    ${product.imageUrl ? `<img class="product-image" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(name)}" loading="lazy">` : product.photo_status === 'available' ? `<p>${escapeHtml(t('imageUnavailable'))}</p>` : ''}
    ${product.photo_status === 'missing' ? `<p class="missing-photo">${escapeHtml(t('photoMissing'))}</p>` : ''}
    ${showPublish && canPublish(product) ? `<button type="button" data-publish="${escapeHtml(product.id)}">${escapeHtml(t('publishProduct'))}</button><p data-publish-message role="status"></p>` : ''}
  </article>`;
}

function buyerOffers() {
  return products.filter(product => product.sales_channel === 'source' && product.status === 'published');
}

function buyerOwnResaleOffers() {
  return products.filter(product => product.organization_id === current?.membership.organization_id &&
    product.sales_channel === 'resale');
}

function buyerOriginCounts() {
  const counts = new Map();
  for (const product of buyerOffers()) {
    const code = String(product.origin_country || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) counts.set(code, (counts.get(code) || 0) + 1);
  }
  return [...counts].sort((a, b) => a[0].localeCompare(b[0]));
}

function buyerCountryFlag(code) {
  return String.fromCodePoint(...[...code].map(letter => 127397 + letter.charCodeAt(0)));
}

function buyerMapMarkup(origins) {
  const unsupported = origins.some(([code]) => !hasBuyerOriginMapCoordinates(code));
  return `<div id="buyer-map" class="buyer-map" role="region" aria-label="${escapeHtml(t('buyerOriginTitle'))}"></div>
    <p id="buyer-map-status" class="buyer-map-note" role="status">${escapeHtml(t('buyerMapNote'))}${unsupported ? ` ${escapeHtml(t('buyerMapUnavailable'))}` : ''}</p>`;
}

function renderBuyerMap() {
  buyerMap?.remove();
  buyerMap = null;
  const element = document.getElementById('buyer-map');
  if (!element || current?.membership.role !== 'buyer' || buyerView !== 'explore' ||
      buyerGeoMode !== 'mixed' || productsLoading || productsError || !productsLoaded) return;
  try {
    buyerMap = mountBuyerOriginMap(element,buyerOriginCounts(),{
      countryLabel,
      countryFlag:buyerCountryFlag,
      onSelect(code) {
        buyerOrigin = code;
        buyerView = 'catalog';
        buyerPage = 0;
        show();
      },
      onTileError() {
        const status = document.getElementById('buyer-map-status');
        if (status) status.textContent = t('buyerMapTilesError');
      }
    });
  } catch {
    const status = document.getElementById('buyer-map-status');
    if (status) status.textContent = t('buyerMapLoadError');
  }
}

function buyerCatalogMarkup() {
  if (productsLoading) return `<p class="notice" role="status">${escapeHtml(t('catalogLoading'))}</p>`;
  if (productsError) return `<p class="error" role="alert">${escapeHtml(t(productsError))}</p>`;
  if (!productsLoaded) return `<p class="notice" role="status">${escapeHtml(t('catalogLoading'))}</p>`;
  let offers = buyerOffers();
  if (buyerOrigin) offers = offers.filter(product => product.origin_country === buyerOrigin);
  if (buyerCategory) offers = offers.filter(product => product.category_en === buyerCategory);
  const query = buyerSearch.trim().toLocaleLowerCase();
  if (query) {
    offers = offers.filter(product => [
      product.name_en, product.name_ar, product.category_en, product.category_ar,
      product.packaging, product.sku
    ].some(value => String(value || '').toLocaleLowerCase().includes(query)));
  }
  const categories = [...new Map(buyerOffers()
    .filter(product => product.category_en)
    .map(product => [product.category_en, product])).values()]
    .sort((a, b) => a.category_en.localeCompare(b.category_en));
  const categoryLabel = product => language === 'ar'
    ? (product.category_ar || product.category_en)
    : product.category_en;
  const pages = Math.max(1, Math.ceil(offers.length / 10));
  buyerPage = Math.max(0, Math.min(buyerPage, pages - 1));
  const shown = offers.slice(buyerPage * 10, buyerPage * 10 + 10);
  return `<section class="buyer-catalog-panel" id="buyer-catalog-panel">
    <div class="buyer-section-heading"><div><span class="buyer-brand">FRUIDGES · LIVE CATALOGUE</span><h2>${escapeHtml(t('buyerCatalogTitle'))}</h2>
      <p>${offers.length} ${escapeHtml(t('buyerProducts'))}${buyerOrigin ? ` · ${escapeHtml(t('buyerCountryFilter'))} ${escapeHtml(countryLabel(buyerOrigin))}` : ''}</p></div>
      ${buyerOrigin ? `<button type="button" class="secondary" data-buyer-clear-origin>${escapeHtml(t('buyerClearCountry'))}</button>` : ''}
    </div>
    <div class="buyer-catalog-toolbar">
      <input id="buyer-search" type="search" value="${escapeHtml(buyerSearch)}" placeholder="${escapeHtml(t('buyerSearch'))}" aria-label="${escapeHtml(t('buyerSearch'))}">
      <div class="buyer-category-chips"><button type="button" class="${buyerCategory?'':'active'}" data-buyer-category="">${escapeHtml(t('buyerAllCategories'))}</button>
      ${categories.map(product => `<button type="button" class="${buyerCategory===product.category_en?'active':''}" data-buyer-category="${escapeHtml(product.category_en)}">${escapeHtml(categoryLabel(product))}</button>`).join('')}</div>
    </div>
    <div class="buyer-offer-list" id="buyer-offer-list">${shown.length ? shown.map(buyerOfferRow).join('') : `<p class="notice" role="status">${escapeHtml(t('catalogEmpty'))}</p>`}</div>
    ${offers.length > 10 ? `<nav class="product-pagination" aria-label="${escapeHtml(t('buyerPage'))}">
      <button type="button" class="secondary" data-buyer-page="${buyerPage-1}" ${buyerPage===0?'disabled':''}>${escapeHtml(t('buyerPrevious'))}</button>
      <span>${escapeHtml(t('buyerPage'))} ${buyerPage+1} / ${pages}</span>
      <button type="button" class="secondary" data-buyer-page="${buyerPage+1}" ${buyerPage+1>=pages?'disabled':''}>${escapeHtml(t('buyerNext'))}</button>
    </nav>` : ''}
  </section>`;
}

function buyerOfferRow(product) {
  const name = language === 'ar' ? product.name_ar : product.name_en;
  const category = language === 'ar' ? product.category_ar : product.category_en;
  const quantity = Number(buyerQuantity[product.id] || 0);
  const stock = Number(product.stock_cartons);
  const destination = product.price_term === 'CIF'
    ? (product.price_destination || t('destinationMissing'))
    : '';
  return `<article class="buyer-offer">
    ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(name)}" loading="lazy">`
      : `<div class="buyer-photo-empty">${escapeHtml(t('photoMissing'))}</div>`}
    <div class="buyer-offer-details">
      <div class="buyer-offer-heading"><div><h3>${escapeHtml(name)}</h3><span lang="ar" dir="rtl">${escapeHtml(product.name_ar)}</span></div><b dir="ltr">${escapeHtml(product.sku)}</b></div>
      <p>${escapeHtml(category || '')}</p>
      <p>${escapeHtml(countryLabel(product.origin_country))} · ${escapeHtml(product.packaging)} · ${escapeHtml(String(product.net_weight_kg))} kg / ${escapeHtml(t('carton'))}</p>
      <p class="buyer-stock">${escapeHtml(t('buyerStock'))}: ${stock > 0 ? escapeHtml(String(stock)) : escapeHtml(t('noStock'))} ${stock > 0 ? escapeHtml(t('carton')) : ''}</p>
      <div class="buyer-offer-prices"><strong>${escapeHtml(formatMoney(product.price_per_carton, product.currency))} / ${escapeHtml(t('carton'))}</strong>
        <span>${escapeHtml(formatPricePerKg(product.price_per_carton, product.net_weight_kg, product.currency))}</span>
        <small>${escapeHtml(product.price_term)}${destination ? ` · ${escapeHtml(destination)}` : ''}</small>
        ${product.fx_usd && product.fx_kwd ? `<small>${escapeHtml(formatConverted(product.price_per_carton, product.fx_usd, 'USD'))} · ${escapeHtml(formatConverted(product.price_per_carton, product.fx_kwd, 'KWD'))} · ${escapeHtml(product.fx_date)} · ${escapeHtml(product.fx_source)}</small>` : `<small>${escapeHtml(t('conversionMissing'))}</small>`}
      </div>
    </div>
    <div class="buyer-offer-actions">
      <div class="buyer-stepper">
        <button type="button" data-buyer-quantity="${escapeHtml(product.id)}" data-buyer-delta="-1" aria-label="${escapeHtml(t('buyerRemoveCarton'))}" ${quantity<=0?'disabled':''}>−</button>
        <strong aria-live="polite">${quantity}</strong>
        <button type="button" data-buyer-quantity="${escapeHtml(product.id)}" data-buyer-delta="1" aria-label="${escapeHtml(t('buyerAddCarton'))}" ${stock<=quantity?'disabled':''}>+</button>
      </div>
      <button type="button" class="buyer-add-button" data-buyer-quantity="${escapeHtml(product.id)}" data-buyer-delta="1" ${stock<=quantity?'disabled':''}>＋ ${escapeHtml(t('buyerAddCarton'))}</button>
    </div>
  </article>`;
}

function buyerExploreContent() {
  if (productsLoading) return `<p class="notice" role="status">${escapeHtml(t('catalogLoading'))}</p>`;
  if (productsError) return `<p class="error" role="alert">${escapeHtml(t(productsError))}</p>`;
  if (!productsLoaded) return `<p class="notice" role="status">${escapeHtml(t('catalogLoading'))}</p>`;
  const origins = buyerOriginCounts();
  const countryCards = origins.map(([code, count]) => `  <button type="button" class="buyer-country-card ${buyerOrigin===code?'chosen':''}" data-buyer-origin="${escapeHtml(code)}" data-country-name="${escapeHtml(countryLabel(code).toLocaleLowerCase())}">
    <span class="buyer-country-flag">${escapeHtml(buyerCountryFlag(code))}</span>
    <span><b>${escapeHtml(countryLabel(code).slice(buyerCountryFlag(code).length + 1))}</b><small>${count} ${escapeHtml(t('buyerProducts'))}</small></span>
    <strong>${count}</strong>
  </button>`).join('');
  return `<section class="buyer-hero">
      <div><span>FRUIDGES · GLOBAL SOURCING</span><h1>${escapeHtml(t('buyerWelcome'))}</h1><p>${escapeHtml(t('buyerWelcomeSub'))}</p></div><strong aria-hidden="true">🌍</strong>
    </section>
    <section class="buyer-geo-panel">
      <div class="buyer-geo-heading"><div><span class="buyer-brand">LIVE PRODUCT DATA</span><h2>🌍 ${escapeHtml(t('buyerOriginTitle'))}</h2><p>${escapeHtml(t('buyerOriginDescription'))}</p></div>
        <div class="buyer-geo-modes" role="group" aria-label="${escapeHtml(t('buyerOriginTitle'))}">
          <button type="button" data-buyer-geo-mode="flags" aria-pressed="${buyerGeoMode==='flags'}" class="${buyerGeoMode==='flags'?'active':''}">🏳️ ${escapeHtml(t('buyerFlags'))}</button>
          <button type="button" data-buyer-geo-mode="mixed" aria-pressed="${buyerGeoMode==='mixed'}" class="${buyerGeoMode==='mixed'?'active':''}">🌍 ${escapeHtml(t('buyerMapFlags'))}</button>
        </div>
      </div>
      <input id="buyer-country-search" type="search" placeholder="🔎 ${escapeHtml(t('buyerCountrySearch'))}" aria-label="${escapeHtml(t('buyerCountrySearch'))}">
      ${buyerGeoMode==='mixed' ? buyerMapMarkup(origins) : ''}
      <h3>${escapeHtml(t('buyerCountries'))}</h3>
      ${countryCards ? `<div class="buyer-country-grid" id="buyer-country-grid">${countryCards}</div>` : `<p class="notice" role="status">${escapeHtml(t('buyerNoOrigins'))}</p>`}
    </section>
    ${buyerCatalogMarkup()}`;
}

function buyerCartMarkup() {
  const lines = Object.entries(buyerQuantity)
    .map(([id, quantity]) => ({product:buyerOffers().find(item => String(item.id) === id), id, quantity:Number(quantity)}))
    .filter(line => Number.isSafeInteger(line.quantity) && line.quantity > 0);
  if (!lines.length) return `<section class="buyer-panel"><h2>🛒 ${escapeHtml(t('buyerCartTitle'))}</h2><p class="notice">${escapeHtml(t('buyerCartEmpty'))}</p><button type="button" class="primary" data-buyer-view="catalog">${escapeHtml(t('buyerViewOffers'))}</button></section>`;
  const totals = new Map();
  let canPrepare = true;
  let invalidStock = false;
  let invalidPrice = false;
  const rows = lines.map(({product, id, quantity}) => {
    if (!product) {
      canPrepare = false;
      return `<article class="buyer-cart-row buyer-cart-row--unavailable"><div><strong>${escapeHtml(t('buyerCartItemUnavailable'))}</strong><p dir="ltr">${escapeHtml(id)}</p></div><span>${quantity} ${escapeHtml(t('carton'))}</span><button type="button" class="secondary" data-buyer-remove-cart="${escapeHtml(id)}">${escapeHtml(t('remove'))}</button></article>`;
    }
    const stock = Number(product.stock_cartons);
    const mills = buyerPriceMills(product.price_per_carton);
    if (!Number.isSafeInteger(stock) || quantity > stock) {
      canPrepare = false;
      invalidStock = true;
    }
    if (mills === null || !['USD','KWD'].includes(product.currency)) {
      canPrepare = false;
      invalidPrice = true;
    }
    const amount = mills === null ? null : mills * BigInt(quantity);
    if (amount !== null) {
      totals.set(product.currency, (totals.get(product.currency) || 0n) + amount);
    }
    const weightMills = buyerWeightMills(product.net_weight_kg);
    const totalWeight = weightMills === null ? null : buyerMillsText(weightMills * BigInt(quantity));
    const amountText = amount === null ? null : buyerMillsText(amount);
    if (weightMills === null) canPrepare = false;
    const destination = product.price_term === 'CIF' ? (product.price_destination || t('destinationMissing')) : '';
    const quantityWarning = Number.isSafeInteger(stock) && quantity > stock
      ? `<p class="buyer-cart-warning" role="alert">${escapeHtml(t('buyerStockChanged'))}</p>` : '';
    return `<article class="buyer-cart-row">
      ${product.imageUrl ? `<img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy">` : ''}
      <div><strong>${escapeHtml(language==='ar'?product.name_ar:product.name_en)}</strong><p lang="ar" dir="rtl">${escapeHtml(product.name_ar)}</p>
        <small>${escapeHtml(countryLabel(product.origin_country))} · ${escapeHtml(product.packaging)}</small>
        <small>${escapeHtml(t('buyerNetWeight'))}: ${escapeHtml(String(product.net_weight_kg))} kg / ${escapeHtml(t('carton'))} · ${escapeHtml(t('buyerTotalWeight'))}: ${escapeHtml(totalWeight === null ? '—' : `${totalWeight} kg`)}</small>
        <small>${escapeHtml(t('buyerTerm'))}: ${escapeHtml(product.price_term)}${destination ? ` · ${escapeHtml(destination)}` : ''}</small>
        <small>${escapeHtml(formatMoney(product.price_per_carton,product.currency))} / ${escapeHtml(t('carton'))} · ${escapeHtml(formatPricePerKg(product.price_per_carton,product.net_weight_kg,product.currency))}</small>
        ${quantityWarning}
      </div>
      <div class="buyer-stepper"><button type="button" data-buyer-quantity="${escapeHtml(id)}" data-buyer-delta="-1" aria-label="${escapeHtml(t('buyerRemoveCarton'))}">−</button><strong>${quantity}</strong><button type="button" data-buyer-quantity="${escapeHtml(id)}" data-buyer-delta="1" aria-label="${escapeHtml(t('buyerAddCarton'))}" ${quantity>=Number(product.stock_cartons)?'disabled':''}>+</button></div>
      <strong>${escapeHtml(amountText === null ? '—' : formatMoney(amountText,product.currency))}</strong>
    </article>`;
  }).join('');
  const totalMarkup = [...totals].map(([currency, mills]) => {
    const amount = buyerMillsText(mills);
    return `<strong dir="ltr">${escapeHtml(formatMoney(amount,currency))}</strong>`;
  }).join('');
  if (!totalMarkup) canPrepare = false;
  const warning = invalidStock ? t('buyerStockChanged') : invalidPrice ? t('buyerInvalidPrice') : '';
  return `<section class="buyer-panel"><div class="buyer-section-heading"><div><span class="buyer-brand">FRUIDGES · LIVE CATALOGUE</span><h2>🛒 ${escapeHtml(t('buyerCartTitle'))}</h2></div><span class="buyer-count">${buyerCartCount()}</span></div>
    <p>${escapeHtml(t('buyerCartHelp'))}</p><div class="buyer-cart-lines">${rows}</div>
    <div class="buyer-totals"><span>${escapeHtml(t('buyerCartTotals'))}</span>${totalMarkup}</div>
    ${warning ? `<p class="error" role="alert">${escapeHtml(warning)}</p>` : ''}
    <button type="button" class="primary buyer-prepare-order" data-buyer-prepare-order ${canPrepare?'':'disabled'}>${escapeHtml(t('buyerPrepareDraft'))}</button>
    ${buyerDraftOrder ? buyerDraftMarkup() : ''}
    <p class="notice">${escapeHtml(t('buyerOrdersUnavailable'))}</p></section>`;
}

function buyerPriceMills(value) {
  const match = /^(\d{1,11})(?:\.(\d{1,3}))?$/.exec(String(value));
  return match ? BigInt(match[1]) * 1000n + BigInt((match[2] || '').padEnd(3,'0')) : null;
}

function buyerWeightMills(value) {
  const match = /^(\d{1,8})(?:\.(\d{1,3}))?$/.exec(String(value));
  return match ? BigInt(match[1]) * 1000n + BigInt((match[2] || '').padEnd(3,'0')) : null;
}

function buyerMillsText(value) {
  return `${value / 1000n}.${(value % 1000n).toString().padStart(3,'0')}`;
}

function createBuyerDraftOrder() {
  const entries = Object.entries(buyerQuantity).filter(([, quantity]) => Number(quantity) > 0);
  if (!entries.length) return {error:'buyerInvalidCart'};
  const totals = new Map();
  const lines = [];
  for (const [id, rawQuantity] of entries) {
    const quantity = Number(rawQuantity);
    const product = buyerOffers().find(row => String(row.id) === id);
    if (!product) return {error:'buyerInvalidCart'};
    const stock = Number(product.stock_cartons);
    if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(stock) || quantity > stock) {
      return {error:'buyerStockChanged'};
    }
    const priceMills = buyerPriceMills(product.price_per_carton);
    const weightMills = buyerWeightMills(product.net_weight_kg);
    if (priceMills === null || weightMills === null || weightMills === 0n ||
        !['USD','KWD'].includes(product.currency)) return {error:'buyerInvalidPrice'};
    const lineAmount = priceMills * BigInt(quantity);
    totals.set(product.currency,(totals.get(product.currency) || 0n) + lineAmount);
    const amountText = buyerMillsText(lineAmount);
    const priceText = buyerMillsText(priceMills);
    lines.push({
      sku:String(product.sku || ''),
      nameEn:String(product.name_en || ''),
      nameAr:String(product.name_ar || ''),
      origin:countryLabel(product.origin_country),
      packaging:String(product.packaging || ''),
      cartons:quantity,
      netWeightKg:buyerMillsText(weightMills),
      totalWeightKg:buyerMillsText(weightMills * BigInt(quantity)),
      priceTerm:String(product.price_term || ''),
      priceDestination:product.price_term === 'CIF' ? String(product.price_destination || '') : '',
      currency:product.currency,
      unitPrice:formatMoney(priceText,product.currency),
      pricePerKg:formatPricePerKg(priceText,product.net_weight_kg,product.currency),
      lineTotal:formatMoney(amountText,product.currency)
    });
  }
  const createdAt = new Date();
  return {order:{
    reference:`DRAFT-${createdAt.getTime()}`,
    date:createdAt.toLocaleString(language === 'ar' ? 'ar' : 'en'),
    language,
    lines,
    totals:[...totals].map(([currency,mills])=>({currency,amount:formatMoney(buyerMillsText(mills),currency)}))
  }};
}

function buyerDraftMarkup() {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(buyerWhatsAppText(buyerDraftOrder))}`;
  return `<section class="buyer-order-actions" aria-label="${escapeHtml(t('buyerDraftActions'))}">
    <p class="buyer-order-status" role="status">${escapeHtml(t('buyerDraftStatus'))} · ${escapeHtml(buyerDraftOrder.reference)}</p>
    <div class="buyer-order-action-buttons">
      <button type="button" class="primary" data-buyer-download-order>${escapeHtml(t('buyerDownloadDocx'))}</button>
      <button type="button" class="secondary" data-buyer-print-order>${escapeHtml(t('buyerPrintDraft'))}</button>
      <a class="secondary" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('buyerWhatsapp'))}</a>
    </div>
    <p class="notice">${escapeHtml(t('buyerWhatsAppNote'))}</p>
  </section>`;
}

function setBuyerStatus(key) {
  const status = document.getElementById('message');
  if (status) status.textContent = t(key);
}

function downloadBuyerDraft() {
  if (!buyerDraftOrder) return;
  try {
    const blob = new Blob([createBuyerOrderDocx(buyerDraftOrder)],{
      type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${buyerDraftOrder.reference}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1500);
  } catch {
    setBuyerStatus('buyerDocumentError');
  }
}

function printBuyerDraft() {
  if (!buyerDraftOrder) return;
  let printWindow;
  try {
    printWindow = window.open('','_blank');
    if (!printWindow) {
      setBuyerStatus('buyerPrintBlocked');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buyerOrderPrintHtml(buyerDraftOrder));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(),300);
  } catch {
    setBuyerStatus('buyerPrintError');
  }
}

function buyerOwnResaleMarkup() {
  if (productsLoading) return `<p class="notice">${escapeHtml(t('catalogLoading'))}</p>`;
  if (productsError) return `<p class="error" role="alert">${escapeHtml(t(productsError))}</p>`;
  const ownOffers = buyerOwnResaleOffers();
  return ownOffers.length ? ownOffers.map(product => productCard(product)).join('')
    : `<p class="notice">${escapeHtml(t('buyerResaleEmpty'))}</p>`;
}

function buyerResaleContent() {
  return `<section class="buyer-panel"><div class="buyer-section-heading"><div><span class="buyer-brand">FRUIDGES · WHOLESALE</span><h2>${escapeHtml(t('buyerResale'))}</h2><p>${escapeHtml(t('buyerResaleIntro'))}</p></div></div>
    <div id="catalog" class="product-grid">${buyerOwnResaleMarkup()}</div><div class="buyer-resale-form">${productForm()}</div></section>`;
}

function buyerPageContent() {
  if (buyerView === 'cart') return buyerCartMarkup();
  if (buyerView === 'orders') return `<section class="buyer-panel"><h2>${escapeHtml(t('buyerOrders'))}</h2><p class="notice">${escapeHtml(t('buyerOrdersUnavailable'))}</p></section>`;
  if (buyerView === 'resale') return buyerResaleContent();
  if (buyerView === 'catalog') return buyerCatalogMarkup();
  return buyerExploreContent();
}

function buyerCartCount() {
  return Object.values(buyerQuantity).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
}

function updateBuyerCartChrome() {
  const count = String(buyerCartCount());
  for (const id of ['buyer-nav-cart-count','buyer-top-cart-count']) {
    const badge = document.getElementById(id);
    if (badge) badge.textContent = count;
  }
}

function buyerWorkspace() {
  const nav = [
    ['explore','buyerExplorer'],['catalog','buyerCatalog'],['resale','buyerResale'],
    ['cart','buyerCart'],['orders','buyerOrders']
  ];
  return `<div class="buyer-layout">
    <aside class="buyer-nav" aria-label="${escapeHtml(t('buyerRole'))}">
      <h2>${escapeHtml(t('buyerRole'))}</h2>
      ${nav.map(([id,label]) => `<button type="button" data-buyer-view="${id}" ${buyerView===id?'aria-current="page"':''}>${escapeHtml(t(label))}${id==='cart'?` <span class="buyer-nav-count" id="buyer-nav-cart-count" aria-live="polite">${buyerCartCount()}</span>`:''}</button>`).join('')}
    </aside>
    <section class="buyer-main">
      <div class="buyer-toptools">
        <span>${escapeHtml(t('buyerRole'))}</span>
        <p id="message" role="status"></p>
        <div>
          <button type="button" data-buyer-view="orders">📦 ${escapeHtml(t('buyerOrders'))}</button>
          <button type="button" data-buyer-view="cart">🛒 ${escapeHtml(t('buyerCart'))} <b class="buyer-count" id="buyer-top-cart-count" aria-live="polite">${buyerCartCount()}</b></button>
          <button type="button" id="refresh-catalog">${escapeHtml(t('refreshCatalog'))}</button>
          <button type="button" id="refresh">${escapeHtml(t('refresh'))}</button>
          <button type="button" class="secondary" id="logout">${escapeHtml(t('logout'))}</button>
        </div>
      </div>
      <div class="buyer-content" id="buyer-content">${buyerPageContent()}</div>
    </section>
  </div>`;
}

function renderBuyerContent() {
  const content = document.getElementById('buyer-content');
  if (!content || current?.membership.role !== 'buyer') return;
  buyerMap?.remove();
  buyerMap = null;
  content.innerHTML = buyerPageContent();
  renderBuyerMap();
  updateBuyerCartChrome();
  document.getElementById('catalog')?.addEventListener('click', publishProduct);
  document.getElementById('product-form')?.addEventListener('submit', saveProduct);
  document.getElementById('refresh-catalog')?.addEventListener('click', loadProducts);
  setupExcelImport();
}

function catalogState() {
  if (productsLoading) return `<p class="notice" role="status">${escapeHtml(t('catalogLoading'))}</p>`;
  if (productsError) return `<p class="error" role="alert">${escapeHtml(t(productsError))}</p>`;
  if (!productsLoaded) return `<p class="notice" role="status">${escapeHtml(t('catalogLoading'))}</p>`;
  if (!products.length) return `<p class="notice" role="status">${escapeHtml(t('catalogEmpty'))}</p>`;
  if(current?.membership.role==='admin') return adminProductList();
  return `<div class="product-grid">${pagedProducts().map(product => productCard(product, {
    showAudience: current?.membership.role === 'admin'
  })).join('')}</div>${productPagination()}`;
}

function productForm() {
  if (!['supplier', 'buyer', 'admin'].includes(current.membership.role)) return '';
  return `<div id="excel-import-host"></div><section class="catalog-form">
    <button type="button" data-product-form-toggle aria-controls="product-form-body" aria-expanded="${productFormOpen}">${escapeHtml(t(productFormOpen?'closeProductForm':'openProductForm'))}</button>
    <div id="product-form-body" ${productFormOpen?'':'hidden'}>
    <h2>${escapeHtml(t('createTitle'))}</h2>
    <form id="product-form">
      <label for="product-image">${escapeHtml(t('productImage'))}</label>
      <input id="product-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="image-hint">
      <p id="image-hint">${escapeHtml(t('imageHint'))}</p>
      ${current.membership.role === 'admin' ? `<label for="product-owner">${escapeHtml(t('productOwner'))}</label><select id="product-owner" name="product_owner" required>${productOwnerOptions()}</select><p id="owner-state" role="status">${directoryError ? escapeHtml(t('directoryError')) : ''}</p><button id="reload-owners" type="button" class="secondary">${escapeHtml(t('refreshDirectory'))}</button>` : ''}
      <label for="product-sku">${escapeHtml(t('sku'))}</label>
      <input id="product-sku" name="sku" maxlength="80" required>
      <label for="product-name-en">${escapeHtml(t('nameEn'))}</label>
      <input id="product-name-en" name="name_en" maxlength="200" required>
      <label for="product-name-ar">${escapeHtml(t('nameAr'))}</label>
      <input id="product-name-ar" name="name_ar" maxlength="200" dir="rtl" required>
      <label for="product-category-en">${escapeHtml(t('categoryEn'))}</label>
      <input id="product-category-en" name="category_en" maxlength="120">
      <label for="product-category-ar">${escapeHtml(t('categoryAr'))}</label>
      <input id="product-category-ar" name="category_ar" maxlength="120" dir="rtl">
      <label for="product-origin">${escapeHtml(t('origin'))}</label>
      <input id="product-origin" name="origin_country" maxlength="2" pattern="[A-Za-z]{2}" required dir="ltr">
      <label for="product-packaging">${escapeHtml(t('packaging'))}</label>
      <input id="product-packaging" name="packaging" maxlength="120" required>
      <label for="product-weight">${escapeHtml(t('weight'))}</label>
      <input id="product-weight" name="net_weight_kg" type="number" min="0.001" step="0.001" required>
      <label for="product-stock">${escapeHtml(t('stock'))}</label>
      <input id="product-stock" name="stock_cartons" type="number" min="0" step="1" value="0" required>
      <label for="product-price">${escapeHtml(t('price'))}</label>
      <input id="product-price" name="price_per_carton" type="number" min="0" step="0.0001" required>
      <label for="product-currency">${escapeHtml(t('currency'))}</label>
      <select id="product-currency" name="currency">
        ${Intl.supportedValuesOf('currency').map(c=>`<option value="${c}" ${c==='USD'?'selected':''}>${c}</option>`).join('')}
      </select>
      ${fxForm(language)}
      <label for="product-term">${escapeHtml(t('term'))}</label>
      <select id="product-term" name="price_term">
        <option value="CIF">${escapeHtml(t('cif'))}</option>
        <option value="FOB">${escapeHtml(t('fob'))}</option>
        <option value="EXW">${escapeHtml(t('exw'))}</option>
      </select>
      <label for="product-destination">${escapeHtml(t('destination'))}</label>
      <input id="product-destination" name="price_destination" maxlength="160">
      <label for="product-status">${escapeHtml(t('status'))}</label>
      <select id="product-status" name="status">
        <option value="draft">${escapeHtml(t('draft'))}</option>
        <option value="published">${escapeHtml(t('published'))}</option>
      </select>
      <p id="product-message" role="status"></p>
      <button id="product-submit" type="submit">${escapeHtml(t('add'))}</button>
    </form>
    </div>
  </section>`;
}

function adminUsersForm() {
  if (current.membership.role !== 'admin') return '';
  return `<section class="card admin-users-card">
    <h2>${escapeHtml(t('manageUsers'))}</h2>
    <form id="create-user" class="admin-users-form">
      <label for="user-email">${escapeHtml(t('userEmail'))}</label>
      <input id="user-email" name="email" type="email" maxlength="254"
        autocomplete="email" required dir="ltr">
      <label for="organization-name">${escapeHtml(t('organizationName'))}</label>
      <input id="organization-name" name="organizationName" maxlength="200">
      <label for="organization-id">${escapeHtml(t('organizationId'))}</label>
      <input id="organization-id" name="organizationId" dir="ltr">
      <label for="user-role">${escapeHtml(t('userRole'))}</label>
      <select id="user-role" name="role" required>
        <option value="supplier">${escapeHtml(t('supplier'))}</option>
        <option value="buyer">${escapeHtml(t('buyerRole'))}</option>
        <option value="restaurant">${escapeHtml(t('restaurant'))}</option>
        <option value="admin">${escapeHtml(t('admin'))}</option>
      </select>
      <p id="create-user-message" role="status" aria-live="polite"></p>
      <button id="create-user-submit" type="submit">${escapeHtml(t('createAccount'))}</button>
    </form>
    <div id="setup-link-result" ${setupLink ? '' : 'hidden'}>
      <p>${escapeHtml(t('accountCreated'))}</p>
      <p>${escapeHtml(t('setupLinkNotice'))}</p>
      <label for="setup-link-output">${escapeHtml(t('setupLinkLabel'))}</label>
      <input id="setup-link-output" value="${escapeHtml(setupLink)}" readonly dir="ltr">
      <button id="copy-setup-link" class="secondary" type="button">${escapeHtml(t('copyLink'))}</button>
      <p id="copy-link-message" role="status" aria-live="polite"></p>
    </div>
  </section>`;
}

const adminViews = [
  ['overview', 'adminOverview'],
  ['suppliers', 'adminSuppliers'],
  ['buyers', 'adminBuyers'],
  ['restaurants', 'adminRestaurants'],
  ['products', 'adminProducts'],
  ['accounts', 'adminAccounts'],
  ['requests', 'adminRequests'],
  ['orders', 'adminOrders'],
  ['analytics', 'adminAnalytics']
];

function adminMetric(id, label, count) {
  const value = productsError ? '—' : productsLoading || !productsLoaded ? '…' : count;
  return `<article class="admin-metric">
    <span>${escapeHtml(t(label))}</span>
    <strong id="${escapeHtml(id)}" aria-live="polite">${escapeHtml(String(value))}</strong>
  </article>`;
}

function adminStatsMarkup() {
  return `<div class="admin-metrics">
    ${adminMetric('admin-total-products', 'adminTotalProducts', products.length)}
    ${adminMetric('admin-source-published', 'adminSourcePublished', products.filter(product => product.sales_channel === 'source' && product.status === 'published').length)}
    ${adminMetric('admin-resale-published', 'adminResalePublished', products.filter(product => product.sales_channel === 'resale' && product.status === 'published').length)}
    ${adminMetric('admin-draft-products', 'adminDraftProducts', products.filter(product => product.status === 'draft').length)}
  </div>`;
}

function adminDirectoryRole(view) {
  return ({ suppliers: 'supplier', buyers: 'buyer', restaurants: 'restaurant' })[view] || '';
}

function companyCountryLabel(code) {
  return /^[A-Z]{2}$/.test(String(code || '')) ? countryLabel(code) : t('countryNotSet');
}

function companyProductsFor(organization, role) {
  const expectedChannel = role === 'supplier' ? 'source' : role === 'buyer' ? 'resale' : '';
  const ownedProducts = products.filter(product => product.organization_id === organization.id);
  const companyProducts = expectedChannel
    ? ownedProducts.filter(product => product.sales_channel === expectedChannel)
    : [];
  return {
    products: companyProducts,
    mismatchedCount: ownedProducts.length - companyProducts.length
  };
}

function companyProductsMarkup(organization, role, productSet) {
  if (productsError) return `<p class="error" role="alert">${escapeHtml(t(productsError))}</p>`;
  if (productsLoading || !productsLoaded) {
    return `<p class="notice" role="status">${escapeHtml(t('catalogLoading'))}</p>`;
  }
  const mismatchNotice = productSet.mismatchedCount
    ? `<p class="notice" role="status">${escapeHtml(t('directoryProductOwnershipMismatch'))}</p>`
    : '';
  const companyProducts = productSet.products;
  if (!companyProducts.length) {
    return `${mismatchNotice}<p class="notice" role="status">${escapeHtml(t('catalogEmpty'))}</p>`;
  }
  return `${mismatchNotice}<div class="product-grid">${companyProducts.map(product =>
    productCard(product, { showAudience: true, showPublish: false })).join('')}</div>`;
}

function companyDirectoryCard(organization, role) {
  const counts = organization.membership_counts[role];
  const countryId = `company-country-${organization.id}`;
  const statusId = `country-status-${organization.id}`;
  const roleLabel = role === 'supplier' ? 'adminSuppliers'
    : role === 'buyer' ? 'adminBuyers' : 'adminRestaurants';
  const productSet = companyProductsFor(organization, role);
  return `<article class="company-card">
    <div class="company-card__heading">
      <div><h3>${escapeHtml(organization.name)}</h3><span class="product-status">${escapeHtml(t(roleLabel))}</span></div>
      <p><strong>${escapeHtml(t('companyCountry'))}:</strong> <span>${escapeHtml(companyCountryLabel(organization.country_code))}</span></p>
    </div>
    <p>${escapeHtml(t('members'))}: ${counts.total} · ${escapeHtml(t('activeMembers'))}: ${counts.active} · ${escapeHtml(t('pendingMembers'))}: ${counts.pending} · ${escapeHtml(t('suspendedMembers'))}: ${counts.suspended}</p>
    <form class="company-country-form" data-company-country data-organization-id="${escapeHtml(organization.id)}">
      <div class="country-field">
        <label for="${escapeHtml(countryId)}">${escapeHtml(t('companyCountry'))}</label>
        <input id="${escapeHtml(countryId)}" name="countryCode" maxlength="2" pattern="[A-Za-z]{2}"
          value="${escapeHtml(organization.country_code || '')}" required dir="ltr">
        <p class="form-hint">${escapeHtml(t('countryCodeHint'))}</p>
      </div>
      <button type="submit"${directorySavingId === organization.id ? ' disabled' : ''}>${escapeHtml(directorySavingId === organization.id ? t('savingCountry') : t('saveCountry'))}</button>
      <p id="${escapeHtml(statusId)}" role="status" aria-live="polite"></p>
    </form>
    <section class="company-products">
      <h4>${escapeHtml(t('directoryProducts'))} (${productsLoaded && !productsError ? productSet.products.length : '…'})</h4>
      ${companyProductsMarkup(organization, role, productSet)}
    </section>
  </article>`;
}

function adminDirectoryContent(role) {
  if (directoryError) return `<p class="error" role="alert">${escapeHtml(t('directoryError'))}</p>`;
  if (directoryLoading || !directoryLoaded) {
    return `<p class="notice" role="status">${escapeHtml(t('directoryLoading'))}</p>`;
  }
  const matching = organizations.filter(organization =>
    organization.membership_counts[role]?.total > 0);
  if (!matching.length) {
    return `<p class="notice" role="status">${escapeHtml(t('directoryEmpty'))}</p>`;
  }
  return `<div class="company-directory">${matching.map(organization =>
    companyDirectoryCard(organization, role)).join('')}</div>`;
}

function renderAdminDirectory() {
  const target = document.getElementById('admin-directory');
  const role = adminDirectoryRole(activeAdminView);
  if (target && role) target.innerHTML = adminDirectoryContent(role);
}

function adminPanel() {
  const directoryRole = adminDirectoryRole(activeAdminView);
  if (directoryRole) {
    return `<section class="admin-directory-section">
      <div class="directory-heading">
        <p>${escapeHtml(t('directoryDescription'))}</p>
        <button id="refresh-directory" class="secondary">${escapeHtml(t('refreshDirectory'))}</button>
      </div>
      <div id="admin-directory" aria-live="polite">${adminDirectoryContent(directoryRole)}</div>
    </section>`;
  }
  if (activeAdminView === 'products') {
    return `<section class="card catalog-card">
      <div class="catalog-heading">
        <h2>${escapeHtml(t('catalogTitle'))}</h2>
        <button id="refresh-catalog" class="secondary">${escapeHtml(t('refreshCatalog'))}</button>
      </div>
      <div id="catalog" aria-live="polite">${catalogState()}</div>
      ${productForm()}
    </section>`;
  }
  if (activeAdminView === 'accounts') {
    return `<div id="admin-user-directory"></div>${adminUsersForm()}`;
  }
  if (activeAdminView === 'requests') {
    return `<div id="admin-user-directory"></div>`;
  }
  if (activeAdminView === 'orders') {
    return `<section class="card module-empty"><p class="notice">${escapeHtml(t('adminOrdersUnavailable'))}</p></section>`;
  }
  if (activeAdminView === 'analytics') {
    return `<p class="notice">${escapeHtml(t('adminAnalyticsNote'))}</p>${adminCatalogueError()}${adminStatsMarkup()}`;
  }
  return `<p class="notice">${escapeHtml(t('adminLiveNote'))}</p>
    ${adminCatalogueError()}
    ${adminStatsMarkup()}
    <section class="admin-quick-access">
      <h3>${escapeHtml(t('adminQuickAccess'))}</h3>
      <div class="admin-quick-links">
        <button type="button" class="secondary" data-admin-view="products">${escapeHtml(t('adminProducts'))}<span>${escapeHtml(t('adminProductsHint'))}</span></button>
        <button type="button" class="secondary" data-admin-view="accounts">${escapeHtml(t('adminAccounts'))}<span>${escapeHtml(t('adminAccountsHint'))}</span></button>
        <button type="button" class="secondary" data-admin-view="requests">${escapeHtml(t('adminRequests'))}<span>${escapeHtml(t('adminRequestsUnavailable'))}</span></button>
        <button type="button" class="secondary" data-admin-view="orders">${escapeHtml(t('adminOrders'))}<span>${escapeHtml(t('adminOrdersUnavailable'))}</span></button>
      </div>
    </section>`;
}

function adminCatalogueError() {
  return `<p id="admin-products-error" class="error" role="alert"${productsError ? '' : ' hidden'}>${productsError ? escapeHtml(t(productsError)) : ''}</p>`;
}

function updateAdminStats() {
  const counts = {
    'admin-total-products': products.length,
    'admin-source-published': products.filter(product => product.sales_channel === 'source' && product.status === 'published').length,
    'admin-resale-published': products.filter(product => product.sales_channel === 'resale' && product.status === 'published').length,
    'admin-draft-products': products.filter(product => product.status === 'draft').length
  };
  for (const [id, count] of Object.entries(counts)) {
    const node = document.getElementById(id);
    if (node) node.textContent = productsError ? '—' : productsLoading || !productsLoaded ? '…' : String(count);
  }
  const error = document.getElementById('admin-products-error');
  if (error) {
    error.hidden = !productsError;
    error.textContent = productsError ? t(productsError) : '';
  }
}

function adminWorkspace() {
  const view = adminViews.find(([id]) => id === activeAdminView) || adminViews[0];
  return `<section class="card workspace-card">
      <p class="eyebrow">Fruidges</p><h1>${escapeHtml(t(current.membership.role))}</h1>
      <p>${escapeHtml(t('ready'))}</p><p id="message" role="status"></p>
      <div class="actions">
        <button id="refresh">${escapeHtml(t('refresh'))}</button>
        <button class="secondary" id="logout">${escapeHtml(t('logout'))}</button>
      </div>
    </section>
    <div class="admin-layout">
      <nav class="admin-nav" aria-label="${escapeHtml(t('adminNavigation'))}">
        ${adminViews.map(([id, label]) => `<button type="button" data-admin-view="${id}"${id === view[0] ? ' aria-current="page"' : ''}${busy ? ' disabled' : ''}>${escapeHtml(t(label))}</button>`).join('')}
      </nav>
      <section class="admin-content" aria-live="polite">
        <header class="admin-page-heading">
          <h2>${escapeHtml(t(view[1]))}</h2>
          ${activeAdminView === 'overview' ? `<p>${escapeHtml(t('adminOverviewDescription'))}</p>` : ''}
        </header>
        ${adminPanel()}
      </section>
    </div>`;
}

function passwordSetupForm() {
  return `<section class="card">
    <h1>${escapeHtml(t('setupPassword'))}</h1>
    <p>${escapeHtml(t('setupPasswordIntro'))}</p>
    ${passwordSetupReady ? `<form id="password-setup">
      <label for="new-password">${escapeHtml(t('newPassword'))}</label>
      <input id="new-password" name="password" type="password" minlength="8"
        autocomplete="new-password" required>
      <label for="confirm-password">${escapeHtml(t('confirmPassword'))}</label>
      <input id="confirm-password" name="confirm" type="password" minlength="8"
        autocomplete="new-password" required>
      <p id="message" role="alert"></p>
      <button id="password-submit" type="submit">${escapeHtml(t('savePassword'))}</button>
    </form>` : `<p id="message" role="status">${escapeHtml(t('preparingInvite'))}</p>`}
  </section>`;
}

function show(message = '') {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('language').textContent = language === 'en' ? 'العربية' : 'English';
  document.getElementById('language').disabled = busy;
  buyerMap?.remove();
  buyerMap = null;
  root.classList.toggle('wide', Boolean(current));
  root.classList.toggle('buyer-page', Boolean(current?.membership.role === 'buyer'));
  root.innerHTML = current
    ? current.membership.role === 'admin' ? adminWorkspace()
    : current.membership.role === 'buyer' ? buyerWorkspace()
    : `<section class="card workspace-card">
        <p class="eyebrow">Fruidges</p><h1>${escapeHtml(t(current.membership.role))}</h1>
        <p>${escapeHtml(t('ready'))}</p><p id="message" role="status"></p>
        <div class="actions">
          <button id="refresh">${escapeHtml(t('refresh'))}</button>
          <button class="secondary" id="logout">${escapeHtml(t('logout'))}</button>
        </div>
      </section>
      <section class="card catalog-card">
        <div class="catalog-heading">
          <h2>${escapeHtml(t('catalogTitle'))}</h2>
          <button id="refresh-catalog" class="secondary">${escapeHtml(t('refreshCatalog'))}</button>
        </div>
        <div id="catalog" aria-live="polite">${catalogState()}</div>
        ${productForm()}
      </section>`
    : passwordSetup ? passwordSetupForm()
    : `<section class="card"><h1>${escapeHtml(t('title'))}</h1><p>${escapeHtml(t('intro'))}</p>
        <form id="login">
          <label for="email">${escapeHtml(t('email'))}</label>
          <input id="email" type="email" name="email" autocomplete="username" required dir="ltr">
          <label for="password">${escapeHtml(t('password'))}</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required>
          <p id="message" role="alert"></p>
          <button id="submit" type="submit">${escapeHtml(t('login'))}</button>
        </form>
      </section>`;
  renderBuyerMap();

  document.getElementById('message').textContent = message;
  document.getElementById('note').textContent = t('note');
  document.getElementById('preview').textContent = t('preview');
  document.getElementById('login')?.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const requestRevision = ++revision;
    document.getElementById('language').disabled = true;
    const button = document.getElementById('submit');
    button.disabled = true;
    button.textContent = t('busy');
    const form = new FormData(event.target);
    try {
      const result = await signIn(client, String(form.get('email')), String(form.get('password')));
      if (revision !== requestRevision) return;
      clearWorkspace();
      current = result;
      busy = false;
      show();
      await loadProducts();
    } catch (error) {
      if (revision !== requestRevision) return;
      current = null;
      clearWorkspace();
      busy = false;
      show(t(error.code || 'network'));
    }
  });
  document.getElementById('logout')?.addEventListener('click', async () => {
    ++revision;
    current = null;
    clearWorkspace();
    busy = true;
    show();
    document.getElementById('submit').disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope:'local' });
      busy = false;
      show(error ? t('local') : '');
    } catch {
      busy = false;
      show(t('local'));
    }
  });
  document.getElementById('refresh')?.addEventListener('click', recheck);
  document.getElementById('refresh-catalog')?.addEventListener('click', loadProducts);
  document.getElementById('reload-owners')?.addEventListener('click',()=>loadAdminDirectory(true));
  document.getElementById('refresh-directory')?.addEventListener('click', () => loadAdminDirectory(true));
  document.getElementById('catalog')?.addEventListener('click', publishProduct);
  document.getElementById('product-form')?.addEventListener('submit', saveProduct);
  document.getElementById('create-user')?.addEventListener('submit', createUserAccount);
  document.getElementById('copy-setup-link')?.addEventListener('click', copySetupLink);
  document.getElementById('password-setup')?.addEventListener('submit', setPassword);
  setupExcelImport();
  const userDirectory=document.getElementById('admin-user-directory');
  if(current?.membership.role==='admin' && ['accounts','requests'].includes(activeAdminView) && userDirectory?.querySelector){
    const mountedRevision=revision;
    mountAdminUsers(userDirectory,client,language,()=>revision===mountedRevision && current?.membership.role==='admin',activeAdminView==='requests');
  }
}

async function loadProducts() {
  if (!current || productsLoading) return;
  const requestRevision = revision;
  productsLoading = true;
  productsError = '';
  renderCatalog();
  try {
    const { data, error } = await client.from('fruidges_products')
      .select(productFields)
      .order('created_at', { ascending:false });
    if (revision !== requestRevision || !current) return;
    if (error || !Array.isArray(data)) {
      productsError = 'catalogError';
      products = [];
      productsLoaded = true;
    } else {
      const hydrated = await withImageUrls(client, data);
      if (revision !== requestRevision || !current) return;
      products = hydrated;
      productsLoaded = true;
    }
  } catch {
    if (revision !== requestRevision || !current) return;
    productsError = 'catalogError';
    products = [];
    productsLoaded = true;
  } finally {
    if (revision === requestRevision && current) {
      productsLoading = false;
      renderCatalog();
      renderAdminDirectory();
    }
  }
}

function validDirectoryResponse(data) {
  const roles = ['supplier', 'buyer', 'restaurant', 'admin'];
  const statuses = ['total', 'active', 'pending', 'suspended'];
  return Array.isArray(data?.organizations) && data.organizations.every(organization =>
    organization && typeof organization.id === 'string' &&
    typeof organization.name === 'string' &&
    (organization.country_code == null || /^[A-Z]{2}$/.test(organization.country_code)) &&
    organization.membership_counts &&
    roles.every(role => organization.membership_counts[role] &&
      statuses.every(status => Number.isInteger(organization.membership_counts[role][status]) &&
        organization.membership_counts[role][status] >= 0)));
}

async function loadAdminDirectory(force = false) {
  if (!current || current.membership.role !== 'admin' || directoryLoading ||
      (directoryLoaded && !force)) return;
  const requestRevision = revision;
  directoryLoading = true;
  directoryError = '';
  renderAdminDirectory();
  try {
    const { data, error } = await client.functions.invoke('admin-organizations', {
      body: { action: 'list' }
    });
    if (revision !== requestRevision || !current) return;
    if (error || !validDirectoryResponse(data)) {
      directoryError = 'directoryError';
      organizations = [];
    } else {
      organizations = data.organizations;
    }
    directoryLoaded = true;
  } catch {
    if (revision !== requestRevision || !current) return;
    directoryError = 'directoryError';
    organizations = [];
    directoryLoaded = true;
  } finally {
    if (revision === requestRevision && current) {
      directoryLoading = false;
      renderAdminDirectory();
      const ownerSelect=document.getElementById('product-owner');
      if(ownerSelect){const selected=ownerSelect.value;ownerSelect.innerHTML=productOwnerOptions();ownerSelect.value=selected;}
      const ownerState=document.getElementById('owner-state');
      if(ownerState) ownerState.textContent=directoryError?t('directoryError'):'';
      if(activeAdminView==='products'){renderCatalog();setupExcelImport();}
    }
  }
}

async function saveCompanyCountry(event, form) {
  event.preventDefault();
  if (directorySavingId || !current || current.membership.role !== 'admin') return;
  const organizationId = form.dataset.organizationId;
  if (!organizations.some(organization => organization.id === organizationId)) return;
  const statusId = `country-status-${organizationId}`;
  const status = document.getElementById(statusId);
  const countryCode = String(new FormData(form).get('countryCode') || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    if (status) {
      status.textContent = t('countryCodeInvalid');
      status.setAttribute('role', 'alert');
    }
    return;
  }

  const requestRevision = revision;
  const submit = form.querySelector('button[type="submit"]');
  directorySavingId = organizationId;
  if (submit) {
    submit.disabled = true;
    submit.textContent = t('savingCountry');
  }
  if (status) status.textContent = '';
  let message = '';
  try {
    const { data, error } = await client.functions.invoke('admin-organizations', {
      body: { action: 'set_country', organizationId, countryCode }
    });
    if (revision !== requestRevision || !current) return;
    if (error || data?.ok !== true || data.organizationId !== organizationId ||
        data.countryCode !== countryCode) throw new Error('country_update_failed');
    organizations = organizations.map(organization => organization.id === organizationId
      ? { ...organization, country_code: countryCode }
      : organization);
    message = 'countrySaved';
  } catch {
    if (revision !== requestRevision || !current) return;
    message = 'countrySaveError';
  } finally {
    if (revision === requestRevision && current) {
      directorySavingId = '';
      renderAdminDirectory();
      const currentStatus = document.getElementById(statusId);
      if (currentStatus) {
        currentStatus.textContent = message ? t(message) : '';
        currentStatus.setAttribute('role', message === 'countrySaveError' ? 'alert' : 'status');
      }
    }
  }
}

async function saveProduct(event) {
  event.preventDefault();
  if (busy || !current) return;
  busy = true;
  const requestRevision = revision;
  const submit = document.getElementById('product-submit');
  const message = document.getElementById('product-message');
  submit.disabled = true;
  submit.textContent = t('saving');
  message.textContent = '';
  const form = new FormData(event.currentTarget);
  const imageFile = form.get('image');
  try { validateImage(imageFile); } catch (error) {
    busy=false; submit.disabled=false; submit.textContent=t('add'); message.textContent=t('imageInvalid'); return;
  }
  const originCountry = String(form.get('origin_country')).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(originCountry)) {
    busy = false;
    submit.disabled = false;
    submit.textContent = t('add');
    message.textContent = t('createError');
    return;
  }
  const owner=current.membership.role==='admin' ? productOwners().find(o=>o.key===form.get('product_owner')) : null;
  if(current.membership.role==='admin' && !owner){busy=false;submit.disabled=false;submit.textContent=t('add');message.textContent=t('ownerRequired');return;}
  const payload = {
    organization_id: owner ? owner.id : current.membership.organization_id,
    sales_channel: owner ? owner.channel : current.membership.role === 'buyer' ? 'resale' : 'source',
    sku: String(form.get('sku')).trim(),
    name_en: String(form.get('name_en')).trim(),
    name_ar: String(form.get('name_ar')).trim(),
    category_en: String(form.get('category_en')).trim() || null,
    category_ar: String(form.get('category_ar')).trim() || null,
    origin_country: originCountry,
    packaging: String(form.get('packaging')).trim(),
    net_weight_kg: String(form.get('net_weight_kg')),
    stock_cartons: Number(form.get('stock_cartons')),
    price_per_carton: String(form.get('price_per_carton')),
    currency: String(form.get('currency')),
    price_term: String(form.get('price_term')),
    price_destination: String(form.get('price_destination')).trim() || null,
    photo_path: null,
    photo_status: 'missing',
    status: String(form.get('status'))
  };
  try { Object.assign(payload,fxFields(form,payload.currency)); } catch {busy=false;submit.disabled=false;submit.textContent=t('add');message.textContent=t('fxInvalid');return;}
  try {
    const imagePath = await uploadImage(client, imageFile, payload.organization_id);
    if (revision !== requestRevision || !current) return;
    if (imagePath) { payload.photo_path=imagePath; payload.photo_status='available'; }
    const { data, error } = await client.from('fruidges_products')
      .insert(payload)
      .select(productFields)
      .single();
    if (revision !== requestRevision || !current) return;
    if (error || !data) {
      busy = false;
      submit.disabled = false;
      submit.textContent = t('add');
      message.textContent = t('createError');
      return;
    }
    const hydrated = await withImageUrls(client, [data]);
    if (revision !== requestRevision || !current) return;
    products = [...hydrated, ...products];
    busy = false;
    show(t('created'));
  } catch (error) {
    if (revision !== requestRevision || !current) return;
    busy = false;
    submit.disabled = false;
    submit.textContent = t('add');
    message.textContent = t(error.message === 'imageUploadError' ? 'imageUploadError' : 'createError');
  }
}

async function createUserAccount(event) {
  event.preventDefault();
  if (busy || !current || current.membership.role !== 'admin') return;
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const email = String(form.get('email') || '');
  const role = String(form.get('role') || '');
  const button = document.getElementById('create-user-submit');
  const message = document.getElementById('create-user-message');
  const requestRevision = revision;
  busy = true;
  document.getElementById('language').disabled = true;
  button.disabled = true;
  button.textContent = t('creatingAccount');
  message.textContent = '';
  try {
    const createdLink = await createUserWithSetupLink(client, email, role, {organizationName: form.get('organizationName'), organizationId: form.get('organizationId')});
    if (revision !== requestRevision || !current || current.membership.role !== 'admin') return;
    setupLink = createdLink;
    formElement.reset();
    const result = document.getElementById('setup-link-result');
    result.hidden = false;
    document.getElementById('setup-link-output').value = setupLink;
    message.textContent = '';
  } catch (error) {
    if (revision !== requestRevision || !current) return;
    message.textContent = t(error.code || 'createUserError');
  } finally {
    if (revision === requestRevision && current) {
      busy = false;
      document.getElementById('language').disabled = false;
      button.disabled = false;
      button.textContent = t('createAccount');
    }
  }
}

async function copySetupLink() {
  const output = document.getElementById('setup-link-output');
  const message = document.getElementById('copy-link-message');
  try {
    await navigator.clipboard.writeText(setupLink);
    message.textContent = t('linkCopied');
  } catch {
    output.focus();
    output.select();
    message.textContent = t('copyLinkFallback');
  }
}

async function setPassword(event) {
  event.preventDefault();
  if (busy || !passwordSetupReady) return;
  const form = new FormData(event.currentTarget);
  const password = String(form.get('password') || '');
  if (password !== String(form.get('confirm') || '')) {
    document.getElementById('message').textContent = t('passwordMismatch');
    return;
  }
  busy = true;
  const requestRevision = revision;
  const button = document.getElementById('password-submit');
  button.disabled = true;
  button.textContent = t('savingPassword');
  try {
    const { error } = await client.auth.updateUser({ password });
    if (revision !== requestRevision) return;
    if (error) {
      busy = false;
      show(t('passwordSetupError'));
      return;
    }
    let result;
    try {
      result = await resolveMembership(client);
    } catch (error) {
      if (revision !== requestRevision) return;
      await client.auth.signOut({ scope:'local' });
      passwordSetup = false;
      passwordSetupReady = false;
      busy = false;
      show(t(error.code || 'configuration'));
      return;
    }
    if (revision !== requestRevision) return;
    passwordSetup = false;
    passwordSetupReady = false;
    current = result;
    busy = false;
    show(t('passwordSaved'));
    await loadProducts();
  } catch {
    if (revision !== requestRevision) return;
    busy = false;
    show(t('passwordSetupError'));
  }
}

function renderCatalog() {
  if (current?.membership.role === 'buyer') {
    if (buyerView === 'resale') {
      const catalog = document.getElementById('catalog');
      if (catalog) catalog.innerHTML = buyerOwnResaleMarkup();
    } else {
      renderBuyerContent();
    }
    return;
  }
  const catalog = document.getElementById('catalog');
  if (catalog) catalog.innerHTML = catalogState();
  updateAdminStats();
}

async function recheck() {
  if (!current || checking) return;
  checking = true;
  const requestRevision = revision;
  try {
    const result = await resolveMembership(client);
    if (revision === requestRevision) {
      const changed = membershipContext(current) !== membershipContext(result);
      if (changed) {
        ++revision;
        clearWorkspace();
        busy = false;
      }
      current = result;
      // A routine refresh must not erase forms the user is filling in.
      if (changed) show();
      await loadProducts();
    }
  } catch (error) {
    if (revision !== requestRevision) return;
    ++revision;
    current = null;
    clearWorkspace();
    busy = true;
    show(t(error.code || 'network'));
    document.getElementById('submit').disabled = true;
    try {
      await client.auth.signOut({ scope:'local' });
    } finally {
      busy = false;
      show(t(error.code || 'network'));
    }
  } finally {
    checking = false;
  }
}

document.getElementById('language').addEventListener('click', () => {
  language = language === 'en' ? 'ar' : 'en';
  show();
});
client.auth.onAuthStateChange(event => {
  if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && passwordSetup) {
    passwordSetupReady = true;
    show();
  }
  if (event === 'SIGNED_OUT' && (current || passwordSetupReady)) {
    ++revision;
    current = null;
    clearWorkspace();
    passwordSetup = false;
    passwordSetupReady = false;
    show(t('session'));
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) recheck();
});
setInterval(recheck, 60000);
show();

function canPublish(product) {
  const m=current?.membership;
  return Boolean(m && product.status==='draft' && ['source','resale'].includes(product.sales_channel) &&
    (m.role==='admin' || (m.organization_id===product.organization_id &&
      ((m.role==='supplier' && product.sales_channel==='source') || (m.role==='buyer' && product.sales_channel==='resale')))));
}
async function publishProduct(event) {
  const button=event.target.closest('[data-publish]');
  if (!button || busy || !current) return;
  const product=products.find(p=>p.id===button.dataset.publish);
  if (!product || !canPublish(product)) return;
  const requestRevision=revision;
  busy=true; button.disabled=true; button.textContent=t('publishingProduct');
  const message=button.parentElement.querySelector('[data-publish-message]');
  try {
    const {data,error}=await client.from('fruidges_products').update({status:'published'})
      .eq('id',product.id).eq('status','draft').select('id,status').single();
    if (revision!==requestRevision || !current) return;
    if(error || !data) throw new Error('publishError');
    products=products.map(p=>p.id===data.id ? {...p,status:data.status} : p);
    renderCatalog();
    document.getElementById('product-details-dialog')?.close?.();
  } catch {
    if(revision!==requestRevision || !current) return;
    button.disabled=false; button.textContent=t('publishProduct');
    message.textContent=t('publishError');
  } finally { if(revision===requestRevision && current) busy=false; }
}

function productOwners(){
 return organizations.flatMap(o=>['supplier','buyer'].filter(role=>o.membership_counts[role]?.active>0)
 .map(role=>({id:o.id,key:o.id+':'+role,name:o.name,role,channel:role==='supplier'?'source':'resale'})));
}
function productOwnerOptions(){
 return `<option value="">${escapeHtml(t('chooseOwner'))}</option>`+productOwners().map(o=>
 `<option value="${escapeHtml(o.key)}">${escapeHtml(o.name)} — ${escapeHtml(t(o.role))}</option>`).join('');
}
function adminProductList(){
 return `<div class="admin-product-list">${pagedProducts().map(p=>{
 const company=organizations.find(o=>o.id===p.organization_id);
 const name=language==='ar'?p.name_ar:p.name_en;
 return `<button type="button" class="admin-product-row product-list-button" data-product-details="${escapeHtml(p.id)}" aria-haspopup="dialog">
 ${p.imageUrl?`<img class="product-thumb" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy">`:`<span class="product-thumb product-thumb-empty">${escapeHtml(t('photoMissing'))}</span>`}
 <strong>${escapeHtml(name)}</strong><span>${escapeHtml(p.sku)}</span><span>${escapeHtml(company?.name||t('ownerUnknown'))}</span><span class="product-status">${escapeHtml(t(p.status))}</span><span>${escapeHtml(formatMoney(p.price_per_carton,p.currency))}</span></button>`;
 }).join('')}</div>${productPagination()}`;
}
function openProductDetails(id,trigger){
 if(current?.membership.role!=='admin')return;
 const product=products.find(p=>p.id===id);if(!product)return;
 document.getElementById('product-details-dialog')?.remove();
 const company=organizations.find(o=>o.id===product.organization_id);
 root.insertAdjacentHTML('beforeend',`<dialog id="product-details-dialog" class="product-dialog" aria-labelledby="product-dialog-title">
 <div class="product-dialog-heading"><h2 id="product-dialog-title">${escapeHtml(language==='ar'?product.name_ar:product.name_en)}</h2><button type="button" class="secondary" data-close-details autofocus>${escapeHtml(t('closeDetails'))}</button></div>
 <p>${escapeHtml(t('productOwner'))}: ${escapeHtml(company?.name||t('ownerUnknown'))}</p>
 <div data-dialog-product>${productCard(product,{showAudience:true})}</div></dialog>`);
 const dialog=document.getElementById('product-details-dialog');
 dialog.querySelector('[data-close-details]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-dialog-product]').addEventListener('click',publishProduct);
 dialog.addEventListener('close',()=>{dialog.remove();if(trigger.isConnected)trigger.focus();else document.getElementById('refresh-catalog')?.focus();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.showModal();
}

function pagedProducts(){
 productPage=Math.max(0,Math.min(productPage,Math.max(0,Math.ceil(products.length/10)-1)));
 return products.slice(productPage*10,productPage*10+10);
}
function productPagination(){
 const pages=Math.max(1,Math.ceil(products.length/10));
 return `<nav class="product-pagination" aria-label="${escapeHtml(t('productPage'))}"><button type="button" class="secondary" data-product-page="${productPage-1}" ${productPage===0?'disabled':''}>${escapeHtml(t('pagePrevious'))}</button><span>${escapeHtml(t('productPage'))} ${productPage+1} / ${pages} · ${products.length}</span><button type="button" class="secondary" data-product-page="${productPage+1}" ${productPage+1>=pages?'disabled':''}>${escapeHtml(t('pageNext'))}</button></nav>`;
}

function setupExcelImport(){
 const host=document.getElementById('excel-import-host');
 if(!host?.querySelector||!current||!['admin','supplier','buyer'].includes(current.membership.role))return;
 const account=current,stamp=revision;
 const owners=account.membership.role==='admin'?productOwners():[{id:account.membership.organization_id,name:account.user.email||t(account.membership.role),channel:account.membership.role==='supplier'?'source':'resale'}];
 mountExcelImport(host,client,language,owners,()=>revision===stamp&&current===account,()=>{productPage=0;loadProducts();});
}
