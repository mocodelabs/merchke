from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
from vendors.models import Vendor
from accounts.models import CustomerProfile


User = get_user_model()


# --- Base User Serializer ---
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_vendor', 'is_customer']


# --- Registration Serializer ---
class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    vendor_type = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'is_vendor', 'is_customer', 'vendor_type']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        vendor_type = validated_data.pop('vendor_type', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            is_vendor=validated_data.get('is_vendor', False),
            is_customer=validated_data.get('is_customer', True)
        )
        if user.is_vendor:
            Vendor.objects.create(
                user=user,
                brand_name=user.username,
                contact_email=user.email,
                vendor_type=vendor_type or 'brand',
            )
        elif user.is_customer:
            CustomerProfile.objects.create(user=user)
        return user

# --- Login Serializer ---
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = ['user', 'phone_number', 'address', 'delivery_preferences']
