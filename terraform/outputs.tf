output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_version" {
  description = "Kubernetes version running on EKS"
  value       = module.eks.cluster_version
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "configure_kubectl" {
  description = "Command to configure kubectl for this cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}"
}

output "get_app_url" {
  description = "Command to get the app's public URL after deployment"
  value       = "kubectl get svc world-tracker -n world-tracker -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'"
}