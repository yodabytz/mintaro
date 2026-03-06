<?php
/**
 * Mintaro AI Rewrite API
 * Handles AI rewrite requests server-side to avoid CORS issues
 */

header('Content-Type: application/json');

// Get the request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['provider'], $input['prompt'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

$provider = $input['provider'];
$prompt = $input['prompt'];
$apiKey = $input['apiKey'] ?? null;

try {
    switch ($provider) {
        case 'huggingface':
            $result = rewriteWithHuggingFace($prompt);
            break;
        case 'openai':
            if (!$apiKey) {
                throw new Exception('API key required for OpenAI');
            }
            $result = rewriteWithOpenAI($prompt, $apiKey);
            break;
        case 'claude':
            if (!$apiKey) {
                throw new Exception('API key required for Claude');
            }
            $result = rewriteWithClaude($prompt, $apiKey);
            break;
        default:
            throw new Exception('Unknown provider: ' . $provider);
    }

    echo json_encode(['success' => true, 'text' => $result]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function rewriteWithHuggingFace($prompt) {
    $huggingFaceToken = getenv('HUGGINGFACE_API_KEY') ?: '';

    // If no API key is set, return a demo response instead of failing
    if (empty($huggingFaceToken)) {
        return rewriteWithDemoAI($prompt);
    }

    $ch = curl_init('https://api-inference.huggingface.co/models/gpt2');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $huggingFaceToken,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'inputs' => $prompt,
        'parameters' => ['max_length' => 500]
    ]));

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($curlError) {
        throw new Exception('Hugging Face connection error: ' . $curlError);
    }

    if ($httpCode !== 200) {
        throw new Exception('Hugging Face API returned status ' . $httpCode);
    }

    $result = json_decode($response, true);
    if (!$result || !isset($result[0]['generated_text'])) {
        throw new Exception('Invalid response from Hugging Face');
    }

    return $result[0]['generated_text'];
}

function rewriteWithDemoAI($prompt) {
    // Simple demo function that shows how the rewrite feature works
    // without needing external API keys
    $demoResponses = [
        'This is a rewritten version of your text that demonstrates the AI rewrite feature.',
        'Your text has been refined and improved for better clarity and engagement.',
        'Here\'s an enhanced version of your content with better flow and impact.',
        'The rewritten text shows how the feature would work with a real AI service.',
        'Your original text, now polished and enhanced for professional communication.'
    ];

    // Return a demo response based on the prompt
    return $demoResponses[crc32($prompt) % count($demoResponses)];
}

function rewriteWithOpenAI($prompt, $apiKey) {
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'gpt-3.5-turbo',
        'messages' => [['role' => 'user', 'content' => $prompt]],
        'max_tokens' => 500
    ]));

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($curlError) {
        throw new Exception('OpenAI connection error: ' . $curlError);
    }

    if ($httpCode !== 200) {
        throw new Exception('OpenAI API returned status ' . $httpCode);
    }

    $result = json_decode($response, true);
    if (!$result || !isset($result['choices'][0]['message']['content'])) {
        throw new Exception('Invalid response from OpenAI');
    }

    return $result['choices'][0]['message']['content'];
}

function rewriteWithClaude($prompt, $apiKey) {
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'claude-3-5-sonnet-20241022',
        'max_tokens' => 500,
        'messages' => [['role' => 'user', 'content' => $prompt]]
    ]));

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($curlError) {
        throw new Exception('Claude connection error: ' . $curlError);
    }

    if ($httpCode !== 200) {
        throw new Exception('Claude API returned status ' . $httpCode);
    }

    $result = json_decode($response, true);
    if (!$result || !isset($result['content'][0]['text'])) {
        throw new Exception('Invalid response from Claude');
    }

    return $result['content'][0]['text'];
}
?>
