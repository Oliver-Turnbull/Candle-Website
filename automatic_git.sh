#!/bin/bash

while true; do
    echo "What would you like to do?"
    echo "1) Pull from Git"
    echo "2) Push to Git"
    echo "3) Exit"
    read -p "Enter option (1/2/3): " option

    if [[ $option == 1 ]]; then
        read -p "Are you sure you want to replace your local directory with the online repo? (Yes/No): " confirmation
        if [[ "$confirmation" =~ ^[Yy](es)?$ ]]; then
            cat /home/t0482192/pat.txt
	    git fetch origin
            git reset --hard origin/main
            echo "Local directory replaced with the remote repo."
            break
        else
            echo "Pull cancelled."
        fi

    elif [[ $option == 2 ]]; then
        cat /home/t0483192/pat.txt

        git status
        read -p "What file(s) do you want to push? (use -A for all files): " filename

        if [[ "$filename" == "-A" ]]; then
            git add -A
        else
            git add "$filename"
        fi

        read -p "Enter a commit message: " message
        git commit -m "$message"

        echo "Pushing to GitHub..."
        git push
        break

    elif [[ $option == 3 ]]; then
        echo "Exiting script."
        break

    else
        echo "Invalid option. Please enter 1, 2, or 3."
    fi

    echo "--------------------------------------"
    echo ""
done


#AHHAHAAHAHAH IT WORRKKSKSKSKSKSKSK
#Thanks lucas for helping me set up github
