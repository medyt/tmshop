<?php

declare(strict_types=1);

return [
    'db' => [
        'host' => 'localhost',
        'name' => 'vbpnetmf_shoptop',
        'user' => 'vbpnetmf_root',
        'pass' => 'parola-mysql',
        'charset' => 'utf8mb4',
    ],
    'cors_origin' => 'https://shop-top.ro',
    'site_url' => 'https://shop-top.ro',
    // Expeditor (From:). from_email + smtp.user = același cont mailbox (cPanel → Email → Connect Devices).
    'mail_from' => 'ShopTop <contact@shop-top.ro>',
    'shop_email' => 'contact@shop-top.ro',
    // Formularul de contact (contact.php). Gol = shop_email.
    'contact_email' => 'contact@shop-top.ro',
    // Adresa la care clienții trimit coletele de retur (aceeași ca expeditorul de pe AWB).
    'operator_name' => 'TM SHOP SRL',
    'return_address' =>
        'Sat Alexandru cel Bun, str. Iaz nr. 1, județul Iași, cod poștal 707591, România',
    // Telefon destinatar pe coletul de retur (doar în email după validare; nu e public pe site).
    'return_phone' => '0757 192 613',
    'shipping_flat_rate' => 19.99,
    // Livrare gratuită de la acest subtotal (RON). 0 = dezactivat (rămâne tariful fix).
    'shipping_free_over' => 0,
    // Câte zile rămâne logat utilizatorul (cookie + sesiune PHP, reînnoit la fiecare request).
    'session_lifetime_days' => 30,

    // Meta Conversions API (Events Manager → Settings → Generate access token).
    // Tokenul se pune doar în config.php (nu în git).
    'meta' => [
        'pixel_id' => '2120556288842775',
        'access_token' => '',
        'test_event_code' => '',
        // Exclude din catalog.csv SKU-urile cu (sale − purchase) sub acest prag.
        'min_product_profit' => 25,
    ],

    // Reminder coș abandonat (cron cPanel → checkout_drafts.php?cron=1&secret=...).
    'cart_reminder' => [
        'secret' => '',
        'delay_hours' => 2,
    ],

    // SMS confirmare comandă (SMSO — https://app.smso.ro/developers/api).
    // token gol = nu se trimite SMS. sender = ID numeric expeditor din SMSO (gol = primul din listă).
    'sms' => [
        'token' => '',
        'sender' => '',
    ],

    // SMTP tranzacțional (confirmări comandă, contact). host gol = fallback mail().
    // Host/port: cPanel → Email Accounts → contact@… → Connect Devices.
    'smtp' => [
        'host' => 'mail.shop-top.ro',
        'port' => 587,
        'secure' => 'tls',
        'user' => 'contact@shop-top.ro',
        'pass' => '',
        'from_email' => 'contact@shop-top.ro',
        'from_name' => 'ShopTop',
    ],

    // BaseLinker: token API din panou (My account > API).
    'baselinker' => [
        'token' => '',
        // ID-ul catalogului (inventory) in care sincronizam produsele.
        'inventory_id' => '',
        // ID-ul grupului de pret din catalog (Inventories > Price groups).
        'price_group_id' => '',
        // ID-ul depozitului din catalog (format folosit: "bl_<id>").
        'warehouse_id' => '',
        // Status la care adaugam comenzile noi (Orders > Statuses). Gol = implicit.
        'order_status_id' => '',
    ],

    // Netopia Payments — LIVE (certificate din Admin → Setări tehnice).
    'netopia' => [
        'sandbox' => false,
        'pos_signature' => 'XXXX-XXXX-XXXX-XXXX-XXXX',
        'public_cert' => __DIR__ . '/keys/netopia-live.cer',
        'private_key' => __DIR__ . '/keys/netopia-live.key',
        'redirect_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_return.php',
        'notify_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_ipn.php',
    ],

    // SmartBill Cloud API — Contul meu → Integrări → API.
    // Tokenul se pune doar în config.php (nu în git).
    'smartbill' => [
        'email' => 'tmshop366@gmail.com',
        'token' => '',
        'company_vat_code' => 'RO54732560',
        'series_name' => 'TM',
        'tax_name' => 'Normala',
        'tax_percentage' => 21,
        'auto_emit' => true, // factură la sync DPD „livrată” (și ramburs → paid)
        'send_email' => true,
        // Gestiune SmartBill (case-sensitive) — stocul magazinului se sincronizează de aici;
        // la factură se descarcă, la retur se stornează (reîncarcă stocul).
        'warehouse_name' => 'depozit',
        'use_stock' => true,
        'measuring_unit_name' => 'bucata',
    ],

    // DPD Romania API — generare AWB (https://api.dpd.ro/api/docs/).
    // Cont test: support@dpd.ro. service_id vine din contract (RO domestic tipic 2505).
    // Dacă vezi „Acces interzis”: lasă client_system_id pe null și cere la DPD
    // activarea WebAPI (Create Shipment + Find Site) pe userul API.
    'dpd' => [
        'enabled' => true,
        'username' => '',
        'password' => '',
        'client_system_id' => null,
        'service_id' => 2505,
        'default_weight_kg' => 1.0,
        'paper_size' => 'A6',
        'sender_phone' => '',
        // Tarife contract TM SHOP SRL (Anexa tarife, vol. 5.001–10.000/lună, <3 kg).
        // Folosite ca fallback când API DPD nu returnează prețul.
        // Valorile sunt fără TVA, fără index combustibil și fără taxă forță de muncă.
        'contract_rates' => [
            'door_to_door_under_3kg' => 8.70,
            'cod_cash' => 1.00,
            'obpd_open' => 1.60,
            'extra_kg_under_30' => 1.33,
        ],
        // Actualizează lunar de pe site-ul DPD (null = nu se aplică în estimarea contract).
        'fuel_index_percent' => null,
        'labor_tax_ron' => null,
        'vat_percent' => 19.0,
    ],

    // FAN Courier SelfAWB — https://api.fancourier.ro
    // client_id = id sucursală din GET /reports/branches
    'fan' => [
        'enabled' => true,
        'username' => '',
        'password' => '',
        'client_id' => 0,
        'service' => 'Standard',
        'service_cod' => 'Cont Colector',
        'default_weight_kg' => 1.0,
        'paper_size' => 'A6',
        // ePOD (X) — necesar pentru etichetă A6 la print PDF nativ Fan.
        'epod' => true,
        // PDF termic 4x6" pentru TSC (ZPL → Labelary).
        'label_width_in' => 4,
        'label_height_in' => 6,
        'label_dpmm' => 8,
        'labelary_url' => 'https://api.labelary.com/v1/printers',
        'label_width_mm' => 100,
        'label_height_mm' => 150,
        'label_scale' => 0.48,
        'bank' => '',
        'bank_account' => '',
        'vat_percent' => 19.0,
    ],
];
