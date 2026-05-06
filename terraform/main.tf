terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "2048-devops-terraform-state"
    key    = "world-tracker/terraform.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region = var.aws_region
}