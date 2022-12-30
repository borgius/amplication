#!env bash
export BASE_DIR=$(realpath "${BASH_SOURCE[0]:-${0}}/..")
export ROOT=$(realpath "$BASE_DIR/../..")

source $BASE_DIR/utils.sh

dependencies() {
    envsubst -h | grep -q fail-fast || {
        curl -L https://github.com/a8m/envsubst/releases/download/v1.2.0/envsubst-`uname -s`-`uname -m` -o envsubst
        chmod +x envsubst
        sudo mv envsubst /usr/local/bin
    }

    type kind &> /dev/null || {
        brew install kind
    }

    kubectl krew &> /dev/null || {
        brew install krew
        brew link --overwrite kubernetes-cli
    }

    kubectl neat &> /dev/null || {
        kubectl krew install neat  
    }
}

createCluster() {
    kind get clusters -q | grep -q kind && kind delete cluster
    kind create cluster --config $BASE_DIR/../kind-config.yaml
}

agroEvents() {
    kubectl create namespace argo-events
    kubectl apply -f https://raw.githubusercontent.com/argoproj/argo-events/stable/manifests/install.yaml --wait
    kubectl apply -f https://raw.githubusercontent.com/argoproj/argo-events/stable/manifests/install-validating-webhook.yaml --wait
    kubectl apply -n argo-events -f https://raw.githubusercontent.com/argoproj/argo-events/stable/examples/eventbus/native.yaml --wait
}

dsgRunner() {
   helm upgrade dsg-runner-infra helm/charts/dsg-runner-infra --debug --install --atomic --wait --create-namespace --namespace amplication --values helm/charts/dsg-runner-infra/values/viktor.yaml
}

build() {
  nx docker:build amplication-build-manager
  kind load docker-image amplication/build-manager:latest
}

runIfNotSourced $@
