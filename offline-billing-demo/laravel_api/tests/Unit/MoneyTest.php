<?php

namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_server_total_uses_decimal_arithmetic(): void
    {
        $this->assertSame('100.00', Money::multiply('100.00', 1));
        $this->assertSame('200.00', Money::multiply('100.00', 2));
        $this->assertSame('10000.00', Money::multiply('100.00', 100));
        $this->assertTrue(Money::equals('100.00', '100.000'));
        $this->assertFalse(Money::equals('100.00', '100.01'));
    }
}
