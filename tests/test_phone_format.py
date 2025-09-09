#!/usr/bin/env python3
"""
Test phone number formatting function.
"""

from app.services.whatsapp_client import format_phone_number, is_valid_brazilian_phone

def test_phone_formatting():
    """Test various phone number formats."""
    
    test_cases = [
        # (input, expected_output, description)
        ("557382005612", "5573982005612", "Add 9 after area code"),
        ("5573982005612", "5573982005612", "Already formatted correctly"),
        ("73982005612", "5573982005612", "Add country code (with 9)"),
        ("7382005612", "5573982005612", "Add country code and 9"),
        ("+5573982005612", "5573982005612", "Remove + sign"),
        ("55 73 98200-5612", "5573982005612", "Remove formatting characters"),
        ("(73) 98200-5612", "5573982005612", "Format local number"),
        ("11987654321", "5511987654321", "São Paulo number with 9"),
        ("1187654321", "5511987654321", "São Paulo number without 9"),
        ("5511987654321", "5511987654321", "São Paulo already formatted"),
        ("551187654321", "5511987654321", "São Paulo add 9"),
    ]
    
    print("=== Testing Phone Number Formatting ===\n")
    
    passed = 0
    failed = 0
    
    for input_phone, expected, description in test_cases:
        result = format_phone_number(input_phone)
        status = "✅ PASS" if result == expected else "❌ FAIL"
        
        print(f"{status} | {input_phone:15} → {result:13} | {description}")
        
        if result == expected:
            passed += 1
        else:
            failed += 1
            print(f"      Expected: {expected}")
    
    print(f"\n=== Results ===")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total:  {passed + failed}")
    
    if failed == 0:
        print("🎉 All tests passed!")
    else:
        print(f"❌ {failed} test(s) failed")


def test_phone_validation():
    """Test phone number validation."""
    
    validation_cases = [
        # (phone, expected_valid, description)
        ("5573982005612", True, "Valid Bahia mobile"),
        ("5511987654321", True, "Valid São Paulo mobile"),
        ("5521987654321", True, "Valid Rio mobile"),
        ("557382005612", True, "Valid after formatting"),
        ("5573812345678", False, "Invalid - landline (no 9)"),
        ("55739820056", False, "Invalid - too short"),
        ("557398200561234", False, "Invalid - too long"),
        ("1173982005612", False, "Invalid - no country code"),
        ("5599987654321", True, "Valid - area code 99"),
        ("5510987654321", False, "Invalid - area code 10"),
    ]
    
    print("\n=== Testing Phone Number Validation ===\n")
    
    passed = 0
    failed = 0
    
    for phone, expected_valid, description in validation_cases:
        formatted = format_phone_number(phone)
        is_valid = is_valid_brazilian_phone(phone)
        status = "✅ PASS" if is_valid == expected_valid else "❌ FAIL"
        
        print(f"{status} | {phone:15} → {formatted:13} | Valid: {is_valid:5} | {description}")
        
        if is_valid == expected_valid:
            passed += 1
        else:
            failed += 1
            print(f"      Expected valid: {expected_valid}")
    
    print(f"\n=== Validation Results ===")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Total:  {passed + failed}")
    
    if failed == 0:
        print("🎉 All validation tests passed!")
    else:
        print(f"❌ {failed} validation test(s) failed")


if __name__ == "__main__":
    test_phone_formatting()
    test_phone_validation()