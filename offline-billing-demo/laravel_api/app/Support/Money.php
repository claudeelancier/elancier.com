<?php

declare(strict_types=1);

namespace App\Support;

use InvalidArgumentException;

final class Money
{
    public static function normalize(int|string $amount): string
    {
        $amount = trim((string) $amount);

        if (! preg_match('/^\d+(\.\d+)?$/', $amount)) {
            throw new InvalidArgumentException('Invalid money value.');
        }

        return bcadd($amount, '0', 2);
    }

    public static function multiply(string $unitPrice, int $quantity): string
    {
        if ($quantity < 0) {
            throw new InvalidArgumentException('Quantity cannot be negative.');
        }

        return bcmul(self::normalize($unitPrice), (string) $quantity, 2);
    }

    public static function equals(int|string $left, int|string $right): bool
    {
        return bccomp(self::normalize($left), self::normalize($right), 2) === 0;
    }
}
