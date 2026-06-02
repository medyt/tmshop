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
    // from_email din smtp trebuie să coincidă de obicei cu contul SMTP (ex. Gmail).
    'mail_from' => 'ShopTop <tmshop366@gmail.com>',
    'shop_email' => 'tmshop366@gmail.com',
    // Formularul de contact (contact.php). Gol = se folosește shop_email.
    'contact_email' => 'tmshop366@gmail.com',
    'shipping_flat_rate' => 25,

    // SMTP pentru email-uri tranzactionale (confirmari comanda, status).
    // Daca host/user sunt goale, sistemul revine la mail() ca fallback.
    'smtp' => [
        'host' => '',
        'port' => 587,
        // 'tls' (STARTTLS, port 587) sau 'ssl' (port 465) sau '' (fara criptare)
        'secure' => 'tls',
        'user' => '',
        'pass' => '',
        'from_email' => 'tmshop366@gmail.com',
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

    // Netopia Payments API v2 (plata online cu cardul). sandbox=true pentru testare.
    'netopia' => [
        'sandbox' => true,
        // Din contul Netopia: API key (Authorization) si POS signature.
        'api_key' => '',
        'pos_signature' => '',
        // URL-uri publice. redirect_url = unde se intoarce clientul dupa plata.
        // notify_url = endpoint-ul IPN (server-to-server) care confirma plata.
        'redirect_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_return.php',
        'notify_url' => 'https://shop-top.ro/shoptop-api/payment_netopia_ipn.php',
    ],
];
