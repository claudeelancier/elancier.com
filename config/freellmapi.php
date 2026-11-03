<?php

return [

    /*
    |--------------------------------------------------------------------------
    | FreeLLMAPI gateway
    |--------------------------------------------------------------------------
    |
    | All provider keys live in the FreeLLMAPI dashboard. This app only
    | stores the unified gateway key and calls the OpenAI-compatible API.
    |
    */

    'base_url' => rtrim((string) env('FREELLMAPI_BASE_URL', 'http://localhost:3001/v1'), '/'),

    'key' => env('FREELLMAPI_KEY'),

    'chat_model' => env('FREELLMAPI_CHAT_MODEL', 'auto'),

    'image_model' => env('FREELLMAPI_IMAGE_MODEL', 'auto'),

    'video_model' => env('FREELLMAPI_VIDEO_MODEL', 'auto'),

    'timeout' => (int) env('FREELLMAPI_TIMEOUT', 60),

    'video_timeout' => (int) env('FREELLMAPI_VIDEO_TIMEOUT', 330),

];
