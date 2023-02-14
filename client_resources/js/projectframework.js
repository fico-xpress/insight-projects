/*
    Insight project framework

    Framework for implementing Insight projects

    (c) Copyright 2022 Fair Isaac Corporation
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

/* global insight   */
/* global $         */
/* global _         */
/* global ko        */
ProjectFramework.prototype = {
    /*
    PUBLIC INTERFACE
    */
    currentProjectFolders: ko.observableArray([]),
    currentOwnProjectFolders: ko.observableArray([]),
    newProjectName: ko.observable(),
    showLoadingOverlay: ko.observable(),
    shelfValid: ko.observable(false),
    shelfValidationMessage: ko.observable(),
    projectRevisionMessage: ko.observable(),

    // initialize the framework
    init: function() {
        var self = this;
        self._init();
    },

    apiVersion: function() {
        var self = this;
        return self.api.version;
    },

    // Create a new project and open it
    createProject: function(newProjectName) {
        var self = this;
        
        console.log(newProjectName);
        // if a name has been supplied
        if (newProjectName) {
            newProjectName = newProjectName.trim();
            return self._createProject(newProjectName);
        }
        else {
            // launch the create dialog
            self.dom.showConfirmationDialog(
                $("body"),
                "create",
                "Create Project",
                "",
                "",
                self._handleCreateConfirmation.bind(self),
                ""
            );
        }
    },
    

    // Open existing project
    openProject: function(projectFolderId) {
        var self = this;

        return self._getProjectScenarioForFolder(projectFolderId)
            .then(function(projectScenario) {
                return self._moveToProject(projectScenario);
            })
            .catch(function() {
                var projectFolder = self._getProjectFolderObject(projectFolderId);
                self.view.showErrorMessage('Failed to open project "' + projectFolder.name + '".');
                return Promise.reject();
            });
    },

    // refresh the list of projects
    refreshProjectList: function() {
        var self = this;
        self._getProjects();
    },

    // Rename project
    renameProject: function(projectFolderId) {
        var self = this;
        var projectFolder = self._getProjectFolderObject(projectFolderId);

        self.dom.showConfirmationDialog(
            $("body"),
            "rename",
            "Rename Project",
            "",
            "",
            self._handleRenameConfirmation.bind(self, projectFolderId),
            projectFolder.name
        );
    },

    // Delete project
    deleteProject: function(projectFolderId) {
        var self = this;
        self.dom.showConfirmationDialog(
            $("body"),
            "delete",
            "Delete Project",
            "Are you sure you wish to delete this project?",
            "This operation cannot be undone.",
            self._deleteProject.bind(self, projectFolderId)
        );
    },

    // Clone project
    cloneProject: function(projectFolderId) {
        var self = this;
        var projectFolder = self._getProjectFolderObject(projectFolderId);

        self.dom.showConfirmationDialog(
            $("body"),
            "clone",
            "Clone Project",
            "",
            'Clone Project will clone the project settings only. If you wish to clone your scenarios as well, export the project and then re-import it.',
            self._handleCloneConfirmation.bind(self, projectFolderId),
            projectFolder.name + " - copy"
        );
    },

    // Export project
    exportProject: function(projectFolderId) {
        var self = this;
        var projectFolder = self._getProjectFolderObject(projectFolderId);

        self.dom.showConfirmationDialog(
            $("body"),
            "export",
            "Export Project",
            "Are you sure you wish to export this project?",
            'This action will export the project settings and all scenarios.',
            self._exportProject.bind(self, projectFolder));
    },

    // Import project
    importProject: function(newProjectName, origin) {
        var self = this;

        newProjectName = newProjectName.trim();
        if (!this._validateProjectName(newProjectName)) {
            self.view.showErrorMessage('\"' + newProjectName + '\" is not a valid name for a project.');
            return Promise.reject();
        }
        return self._importProject(newProjectName, origin);
    },

    // Check the shelf is properly configured with project [ and optionally scenarios]
    validateShelf: function(pagetype, scenarios) {
        var self = this;
        var response = {};

        switch (pagetype) {
            case 'scenario':
                response = self._validateForScenarioPage(scenarios);
                break;
            case 'project':
                response = self._validateForProjectPage(scenarios);
                break;
            default:
                response.valid = true;
                // no validation for now
                break;
        }
        return response;
    },

    shareProject: function(projectFolderId) {
        var self = this;

        var projectFolder = self._getProjectFolderObject(projectFolderId);

        return self._getProjectScenarioForFolder(projectFolderId)
            .then(function(projectScenario) {
                // possible share combinations
                var folderTargetShare = projectFolder.shareStatus;
                var projectTargetShare = projectScenario.shareStatus;
                var currentShare = "";

                if (folderTargetShare == "PRIVATE" && projectTargetShare == "PRIVATE")
                    currentShare = "SHARE_PRIVATE";
                else if (folderTargetShare == "READONLY" && projectTargetShare == "READONLY")
                    currentShare = "SHARE_READONLY";
                else if (folderTargetShare == "FULLACCESS" && projectTargetShare == "READONLY")
                    currentShare = "SHARE_PROJECTREADONLY";
                else if (folderTargetShare == "FULLACCESS" && projectTargetShare == "FULLACCESS")
                    currentShare = "SHARE_FULL";
                else
                    currentShare = "SHARE_UNRECOGNISED";

                self.dom.showConfirmationDialog(
                    $("body"),
                    "share",
                    "Share Project",
                    "",
                    "",
                    self._handleShareConfirmation.bind(self, projectFolderId),
                    currentShare
                );
            });
    },
    goToManageView: function() {
        var self = this;
        insight.openView(self.config.manageView);
    },

    /*
    PRIVATE
    */
    projectRevision: 0,

    _getProjects: function() {
        var self = this;
        
        console.log(self.api.getVersion());

        debugger;
        return self.api.getProjects(self.appId)
            .then(function(projects) {
                // v4 needs username to user name resolution
                if (self.api.getVersion() == 1)
                    return self.app.getUsers()
                        .then(function(response) {
                            var users = {};
                            for (var i = 0; i < response.length; i++)
                                users[response[i]._data.username] = response[i]._data.displayName;

                            for (var i = 0; i < projects.length; i++)
                                projects[i].owner = {
                                    name: users[projects[i].ownerId]
                                };
                            
                            return projects;
                        });
                else
                    return projects;
            })
            // then fetch any additional attributes for each project
            .then(projects => {
                if (self.config.projectAttributes && self.config.projectAttributes.length > 0) {
                    var attrFetches = [];
                    // for each project
                    for (let i = 0; i < projects.length; i++) {
                        // get the project scenario id
                        var promise = self._getProjectScenarioForFolder(projects[i].id)
                            .then(scenario => {
                                return self.api.getScenarioEntities(scenario.id, self.config.projectAttributes)
                            })
                            .then(attribs => {
                                projects[i]["attributes"] = attribs;
                                return projects[i];
                            });
                        attrFetches.push(promise);
                    }
                    
                    // wait for all the queries and return the augmented project list
                    return Promise.all(attrFetches)
                        .then(() => projects);
                }
                else
                    return projects;
                
            })
            // then compute the list of projects owned by the current user
            .then(projects => {
                debugger;
                return self.view.getUser()
                .then(currentUser => {
                    var owned = [];
                    for (var i = 0; i < projects.length; i++)
                        if (projects[i].owner.name === currentUser.getFullName())
                            owned.push(projects[i]);
                 
                    // and update the lists
                    self.currentProjectFolders([]);
                    self.currentProjectFolders(projects);
                    self.currentOwnProjectFolders([]);
                    self.currentOwnProjectFolders(owned);

                    return projects;
                })
            })
            .catch(function(error) {
                self.view.showErrorMessage('Unexpected error fetching projects list');
                throw error;
            });
    },
    _moveToProject: function(projectScenario) {
        var self = this;

        self.view.setShelf([projectScenario.id]);
        insight.openView(this.config.defaultView);
    },
    _getProjectScenarioForFolder: function(folderId) {
        var self = this;

        if (!folderId) {
            self.view.showErrorMessage('This doesn\'t look like a project folder.');
            return Promise.reject();
        }
        return self.api.getChildren(folderId)
            .then(function(children) {
                var found;
                for (var i = 0; i < children.length; i++)
                    if (children[i].scenarioType == self.config.projectScenarioType)
                        found = children[i];
                if (found)
                    return found;
                else
                    throw new Error;
            }).catch(function() {
                self.view.showErrorMessage('This doesn\'t look like a project folder.');
                return Promise.reject();
            });
    },
    _validateProjectName: function(newProjectName) {
        return !(!newProjectName || newProjectName.indexOf("_") == 0);
    },
    _getProjectFolderObject: function(projectFolderId) {
        var self = this;
        var projectFolders = this.currentProjectFolders();

        var folderIndex;
        for (var i = 0; i < projectFolders.length; i++)
            if (projectFolders[i].id === projectFolderId)
                folderIndex = i;

        return projectFolders[folderIndex];
    },
    _handleCreateConfirmation: function(event) {
        var self = this;
        var newName = self._getModalValue(event);

        if (!self._validateProjectName(newName)) {
            self.view.showErrorMessage('\"' + newName + '\" is not a valid name for a project.');
            return Promise.reject();
        }

        // check if the chosen name is already in use
        var namingConflict = false;
        $.each(self.currentProjectFolders(), function(i, v) {
            if (v.name == newName) {
                self.view.showErrorMessage("Cannot rename. A project exists with the same name");
                namingConflict = true;
            }
        });

        if (!namingConflict)
            return self._createProject( newName);
        else
            return Promise.reject();
    },
    _createProject: function(newProjectName) {
        var self=this;
        var newScenario;
        var newFolder;
        
        if (!self._validateProjectName(newProjectName)) {
            self.view.showErrorMessage('\"' + newProjectName + '\" is not a valid name for a project.');
            return Promise.reject();
        }

        // check if the chosen name is already in use
        var namingConflict = false;
        $.each(self.currentProjectFolders(), function(i, v) {
            if (v.name == newProjectName) {
                self.view.showErrorMessage("Cannot create. A project exists with the same name");
                namingConflict = true;
            }
        });

        if (namingConflict)
            return Promise.reject();

        return self.api.createRootFolder(self.app, newProjectName)
            .then(function(folder) {
                newFolder = folder;
                return self.api.createScenario(self.app, folder, folder.name, self.config.projectScenarioType);
            })
            .then(function(scenario) {
                newScenario = scenario;
                return self.view.executeScenario(scenario.id, insight.enums.ExecutionType.LOAD, {
                    suppressClearPrompt: true
                });
            })
            .then(function() {
                return self._moveToProject(newScenario);
            })
            .catch(function(error) {
                self.view.showErrorMessage('Failed to create project');

                // attempt to clean up
                if (newFolder)
                    self.api.deleteFolder(newFolder.id);

                return Promise.reject();
            });
    },
    _handleCloneConfirmation: function(projectFolderId, event) {
        var self = this;

        var newName = self._getModalValue(event);
        self._cloneFolderAndProjectScenario(projectFolderId, newName);
    },
    _cloneFolderAndProjectScenario: function(projectFolderId, newName) {
        var self = this;

        if (!self._validateProjectName(newName)) {
            self.view.showErrorMessage('\"' + newName + '\" is not a valid name for a project.');
            return Promise.reject();
        }

        // check if the chosen name is already in use
        var namingConflict = false;
        $.each(self.currentProjectFolders(), function(i, v) {
            if (v.name == newName) {
                self.view.showErrorMessage("Cannot clone. A project exists with the same name");
                namingConflict = true;
            }
        });

        if (namingConflict)
            return Promise.reject();

        var projectFolder = self._getProjectFolderObject(projectFolderId);
        var actualNewName;
        var newFolder;
        // attempt to create the folder with name newName
        return self.api.createRootFolder(self.app, newName)
            .then(function(folder) {
                // name may have been decorated
                actualNewName = folder.name;
                newFolder = folder;
                return self._getProjectScenarioForFolder(projectFolderId)
            })
            // copy the project scenario into the new folder as the new actual name
            .then(function(projectScenario) {
                return self.api.cloneScenario(projectScenario.id, newFolder, actualNewName);
            })
            // all good
            .then(function() {
                var successMessage = '';

                // there is a very small chance that a folder of the required name was created between the name conflict check and the folder create
                if (actualNewName !== newName) {
                    successMessage = 'Project "' + projectFolder.name + '" was successfully cloned and named "' + actualNewName + '" to avoid a naming conflict.'
                } else {
                    successMessage = 'Project "' + projectFolder.name + '" was successfully cloned to project "' + actualNewName + '".';
                }
                // update the projects list
                self._getProjects();
                self.view.showInfoMessage(successMessage);
                return Promise.resolve();
            })
            .catch(function() {
                // something went wrong
                // if we created a folder, delete it
                if (newFolder) {
                    return self.api.deleteFolder(newFolder.id)
                        .then(function() {
                            // managed to clean up
                            self.view.showErrorMessage('Failed to clone project "' + projectFolder.name + '". Changes were rolled back.');
                            return Promise.reject();
                        })
                        .catch(function(error) {
                            // failed to clean up
                            self.view.showErrorMessage('Failed to clone project "' + projectFolder.name + '". A folder for this new project was created, you can delete it using the Scenario Explorer.');
                            return Promise.reject();
                        });
                } else {
                    self.view.showErrorMessage('Failed to clone project "' + projectFolder.name + '". No changes were made.');
                    return Promise.reject();
                }
            });
    },
    _deleteProject: function(projectFolderId) {
        var self = this;

        var projectFolder = self._getProjectFolderObject(projectFolderId);
        return self.api.deleteFolder(projectFolderId)
            .then(function(data) {
                self.view.showInfoMessage('Project "' + projectFolder.name + '" successfully deleted.');
                self._getProjects();
                return Promise.resolve();
            }).catch(function(message) {
                self.view.showErrorMessage('Failed to delete project "' + projectFolder.name + '". No changes have been made.');
                self._getProjects();
                return Promise.reject();
            });
    },
    _getModalValue: function(event) {
        var modal = $(event.target).parents('.modal');
        var name = modal.find('.dialogValue').val();
        
        //console.log(name);
        var trimmed = name.trim();
        //console.log(trimmed);
        return trimmed;
    },
    _handleRenameConfirmation: function(projectFolderId, event) {
        var self = this;
        var newName = self._getModalValue(event);

        if (!self._validateProjectName(newName)) {
            self.view.showErrorMessage('\"' + newName + '\" is not a valid name for a project.');
            return Promise.reject();
        }

        // check if the chosen name is already in use
        var namingConflict = false;
        $.each(self.currentProjectFolders(), function(i, v) {
            if (v.name == newName) {
                self.view.showErrorMessage("Cannot rename. A project exists with the same name");
                namingConflict = true;
            }
        });

        if (!namingConflict)
            return self._renameFolderAndProjectScenario(projectFolderId, newName);
        else
            return Promise.reject();
    },
    _renameFolderAndProjectScenario: function(projectFolderId, newName) {
        var self = this;

        return self._getProjectScenarioForFolder(projectFolderId).then(function(projectScenario) {
            var previousName = projectScenario.name; // for rollback

            // try to rename the project scenario inside first
            return self.api.renameScenario(projectScenario.id, newName)
                .then(function(value) {
                    return self.api.renameFolder(projectFolderId, newName)
                        .then(function(value) {
                            self.view.showInfoMessage('Project successfully renamed from "' + previousName + '" to "' + newName + '".');
                            self._getProjects();
                        }).catch(function() {
                            var errormsg = "Failed to rename the project folder but could not roll back action. To correct this error state please rename your project again.";
                            return self.api.renameScenario(projectScenario.id, previousName)
                                .then(function() {
                                    errormsg = "Failed to rename the project folder. Action rolled back.";
                                    return Promise.reject();
                                }).catch(function() {
                                    self.view.showErrorMessage(errormsg);
                                    return Promise.reject();
                                });
                        });
                });
        }).catch(function() {
            self.view.showErrorMessage("Failed to rename the project. Action rolled back.");
            return Promise.reject();
        });
    },
    _handleShareConfirmation: function(projectFolderId, event) {
        var self = this;

        var modal = $(event.originalEvent.target).parents('.modal');
        var shareMode = modal.find("input[name='dialogValue']:checked").val();
        self._shareProject(projectFolderId, shareMode);
    },
    _shareProject: function(projectFolderId, newShare) {
        var self = this;

        var projectFolder = self._getProjectFolderObject(projectFolderId);

        // possible share combinations
        var folderTargetShare;
        var projectTargetShare;

        if (newShare == "SHARE_READONLY") {
            folderTargetShare = "READONLY";
            projectTargetShare = "READONLY";
        } else if (newShare == "SHARE_PROJECTREADONLY") {
            folderTargetShare = "FULLACCESS";
            projectTargetShare = "READONLY";
        } else if (newShare == "SHARE_FULL") {
            folderTargetShare = "FULLACCESS";
            projectTargetShare = "FULLACCESS";
        }
        // default to private
        else {
            folderTargetShare = "PRIVATE";
            projectTargetShare = "PRIVATE";
        }

        return self._getProjectScenarioForFolder(projectFolderId)
            .then(function(projectScenario) {
                var previousMode = projectScenario.shareStatus;

                return self.api.shareScenario(projectScenario.id, projectTargetShare)
                    .then(function() {
                        return self.api.shareFolder(projectFolderId, folderTargetShare)
                            .then(function() {
                                // invalidate and refresh the information we have cached for the project
                                self._getProjects();
                                self.view.showInfoMessage('Project share status updated');
                            }).catch(function() {
                                var errormsg = "Failed to change share status for project folder but could not rollback. To correct this error state please set the share status directly.";
                                return self.api.shareScenario(projectScenario.id, previousMode)
                                    .then(function() {
                                        errormsg = "Failed to change share status for project folder. Action rolled back.";
                                        throw new Error;
                                    }).catch(function() {
                                        self.view.showErrorMessage(errormsg);
                                        return Promise.reject();
                                    });
                            });
                    });
            }).catch(function() {
                self.view.showErrorMessage("Failed to change the project share status.");
                return Promise.reject();
            });
    },
    _exportProject: function(projectFolder) {
        var self = this;
        if (self.api.getVersion() == 1) {
            // syncronous browser download for Insight 4 servers
            self.view.showInfoMessage('Exporting project \'' + projectFolder.name + '\'...');
            self.dom.downloadFile(self.api.getFolderExportDownloadURL(projectFolder.id));
        } else {
            // async export to server location for Insight 5
            return self.api.exportFolder(projectFolder)
                .then(function() {
                    self.view.showInfoMessage('Exporting project \'' + projectFolder.name + '\'. See Tasks Dialog for status.');
                })
                .catch(function() {
                    self.view.showErrorMessage('Failed to export project \'' + projectFolder.name + '\'');
                });
        }
    },
    _importProject: function(projectName, origin) {
        var self = this;
        // a unique name for the working folder
        var workingFolderName = "projectImport_" + Date.now();
        var workingFolder;

        // prompt the user for a file selection
        if (origin == "UPLOAD")
            return self.dom.promptFileUpload($("body")) // returns array of files
                .then(function(files) {

                    // obscure the view with the import-in-progress custom overlay
                    self.dom.trigger('project.overlay.show', 'Importing Project');

                    // next create the working folder
                    return self.api.createRootFolder(self.app, workingFolderName)
                        .then(function(folder) {
                            workingFolder = folder;
                        })
                        .then(function() {
                            return self.api.uploadImportFile(workingFolder, files)
                        })
                        .then(function(imported) {
                            // need to do some renaming and moving into the final position
                            return self._handleImportedProject(projectName, workingFolder, imported);
                        })
                        .then(function(projectScenario) {
                            // we have finished

                            // first delete the working folder
                            return self._cleanupWorkingFolder(workingFolder.id)
                                .then(function() {
                                    self.dom.trigger('project.overlay.setMessage', 'Project Import Complete');
                                    // wait 2 seconds then wrap up
                                    return new Promise(function(resolve, reject) {
                                        setTimeout(function() {
                                            self.dom.trigger('project.overlay.hide');
                                            self._moveToProject(projectScenario);
                                            self.view.showInfoMessage('Project imported successfully as "' + projectScenario.name + '"');
                                            resolve();
                                        }, self.importOverlayDelay);
                                    });
                                });
                        })
                })
                .catch(function(error) {
                    return self._handleUpgradeErrors(workingFolder ? workingFolder.id : undefined, error);
                });

        if (origin == "SERVER")
            return self.api.createRootFolder(self.app, workingFolderName)
                .then(function(folder) {
                    workingFolder = folder;
                    return folder;
                })
                .then(function() {
                    return self.view.importFromServer(workingFolder.id, "FOLDER");
                })
                .then(function(portationId) {
                    // obscure the view with the import-in-progress custom overlay
                    self.dom.trigger('project.overlay.show', 'Importing Project');

                    return self.api.waitForUpload(portationId);
                })
                .then(function(imported) {
                    // need to do some renaming and moving into the final position
                    return self._handleImportedProject(projectName, workingFolder, imported);
                })
                .then(function(projectScenario) {
                    // we have finished

                    // first delete the working folder
                    return self._cleanupWorkingFolder(workingFolder.id)
                        .then(function() {
                            self.dom.trigger('project.overlay.setMessage', 'Project Import Complete');
                            // wait 2 seconds then wrap up
                            return new Promise(function(resolve, reject) {
                                setTimeout(function() {
                                    self.dom.trigger('project.overlay.hide');
                                    self._moveToProject(projectScenario);
                                    self.view.showInfoMessage('Project imported successfully as "' + projectScenario.name + '"');
                                    resolve();
                                }, self.importOverlayDelay);
                            });
                        });
                })
                .catch(function(error) {
                    return self._handleUpgradeErrors(workingFolder ? workingFolder.id : undefined, error);
                });
    },
    // clean up working folder after import
    _cleanupWorkingFolder: function(workingFolderId) {
        var self = this;
        return self.api.deleteFolder(workingFolderId);
    },
    // handle the error and return a rejected promise in all cases
    _handleUpgradeErrors: function(workingFolderId, reason) {
        var self = this;
        reason = reason || 'Unexpected error during project import.';

        // hide the overlay for v4, v5 doesnt need this
        self.dom.trigger('project.overlay.hide');

        self.view.showErrorMessage(reason);

        if (workingFolderId) {
            var errormsg = 'The import was not rolled back, to correct this, delete the folder from the scenario explorer.';
            return self.api.deleteFolder(workingFolderId)
                .then(function() {
                    errormsg = 'The import was rolled back.';
                    throw new Error();
                }).catch(function() {
                    self.view.showErrorMessage(errormsg);
                    return Promise.reject();
                });
        } else {
            return Promise.reject();
        }
    },
    _handleImportedProject: function(desiredProjectName, workingFolder, projectImport) {
        var self = this;

        // number of scenarios created by the import
        var projectScenarios = [];
        for (var i = 0; i < projectImport.scenarios.length; i++)
            if (projectImport.scenarios[i].scenarioType == self.config.projectScenarioType)
                projectScenarios.push(projectImport.scenarios[i]);

        // if there is more than 1 folder imported then filter out the sub-folders
        var projectRootFolders = [];
        if (projectImport.folders.length == 1)
            projectRootFolders.push(projectImport.folders[0]);
        else if (projectImport.folders.length > 1)
            for (var i = 0; i < projectImport.folders.length; i++)
                if (projectImport.folders[i].parent.id === workingFolder.id)
                    projectRootFolders.push(projectImport.folders[i]);

        if (projectScenarios.length == 0)
            return Promise.reject("Error during project import. The imported file does not contain a project scenario");
        if (projectScenarios.length > 1)
            return Promise.reject("Error during project import. The imported file contains more than 1 project scenario");
        if (projectRootFolders.length == 0)
            return Promise.reject("Error during project import. The imported file does not contain a project folder");
        if (projectRootFolders.length > 1)
            return Promise.reject("Error during project import. The imported file contains more than one project folder");

        return self._handleImportedFolder(projectRootFolders[0], projectScenarios[0], desiredProjectName);
    },
    _handleImportedFolder: function(projectFolder, projectScenario, desiredProjectName) {
        var self = this;
        // rename the project folder first, then move it
        // on moving, the name might be decorated if there is a collision
        // so rename project scenairo to the new name of the project folder

        // rename the project folder to desired name
        return self.api.renameFolder(projectFolder.id, desiredProjectName)
            .then(function() {
                projectFolder.name = desiredProjectName;
                // move the folder to the root
                return self.api.moveFolderToRoot(self.appId, projectFolder)
                    .then(function(newProjectFolder) {
                        // rename project scenario to match the final (possibly decorated) name of the project folder
                        projectScenario.name = newProjectFolder.name;
                        return self.api.renameScenario(projectScenario.id, projectScenario.name)
                            .then(function() {
                                return projectScenario;
                            });
                    });
            })
            .catch(function() {
                // failed to rename the folder
                self.view.showErrorMessage("Failed to rename the imported project to " + desiredProjectName);
                return Promise.reject();
            });
    },
    dom: {
        confirmDialog: null,
        uploadTimeout: 300000,

        trigger: function(event) {
            $(document).trigger(event, _.without(arguments, arguments[0]));
        },
        onEscape: function() {
            $('[data-bb-handler="cancel"]').click();
        },
        showConfirmationDialog: function(parent, action, title, message1, message2, callback, currentValue) {
            var self = this;

            // message2 gets wrapped in an info box
            if (message2) {
                message2 = '<div class="alert alert-info"><p>' + message2 + '</p></div>';
            }

            var body;
            var customclass;
            switch (action) {
                case "create":
                    customclass = "create-dialog";
                    body = '<div><p>' + message1 + '</p>' +
                        '<form id="modal-form" class="form-horizontal">' +
                        '<div class="form-group">' +
                        '<label for="newProjectName" class="control-label col-sm-3">Project Name</label>' +
                        '<div class="col-sm-9">' +
                        '<input type="text" class="dialogValue form-control" value="">' +
                        '</div></div></form><div>' + message2 + '</div></div>';
                    break;
                case "share":
                    customclass = "share-dialog";
                    body = '<div><p>' + message1 + '</p>' +
                        '<p><form id="modal-form">' +
                        '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_PRIVATE" value="SHARE_PRIVATE">Don\'t share this project</label></div>' +
                        '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_READONLY" value="SHARE_READONLY">Share project and scenarios read only</label></div>' +
                        '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_PROJECTREADONLY" value="SHARE_PROJECTREADONLY">Allow other users to create/edit scenarios</label></div>' +
                        '<div class="radio"><label><input type="radio" name="dialogValue" class="dialogValue" id="SHARE_FULL" value="SHARE_FULL">Allow other users to edit the project and create/edit scenarios</label></div>' +
                        '<div>' + message2 + '</div>';
                    break;
                case "rename":
                    customclass = "rename-dialog";
                    body = '<div><p>' + message1 + '</p>' +
                        '<form id="modal-form" class="form-horizontal">' +
                        '<div class="form-group">' +
                        '<label for="newProjectName" class="control-label col-sm-3">Project Name</label>' +
                        '<div class="col-sm-9">' +
                        '<input type="text" class="dialogValue form-control" value="">' +
                        '</div></div></form><div>' + message2 + '</div></div>';
                    break;
                case "clone":
                    customclass = "clone-dialog";
                    body = '<div><p>' + message1 + '</p>' +
                        '<form id="modal-form" class="form-horizontal">' +
                        '<div class="form-group">' +
                        '<label for="newProjectName" class="control-label col-sm-3">Project Name</label>' +
                        '<div class="col-sm-9">' +
                        '<input type="text" class="dialogValue form-control" value="">' +
                        '</div></div></form><div>' + message2 + '</div></div>';
                    break;
                case "export":
                    customclass = "export-dialog";
                    body = '<div><p>' + message1 + '</p><div style="margin-top: 10px">' + message2 + '</div></div>';
                    break;
                case "delete":
                    customclass = "delete-dialog";
                    body = '<div><p>' + message1 + '</p><div style="margin-top: 10px">' + message2 + '</div></div>';
                    break;
            }

            self.confirmDialog = bootbox.dialog({
                container: parent,
                title: title,
                message: $(body).html(),
                buttons: {
                    ok: {
                        label: action.charAt(0).toUpperCase() + action.slice(1),
                        callback: callback,
                        className: 'btn-primary affirmative'
                    },
                    cancel: {
                        label: 'Cancel',
                        className: 'btn-secondary'
                    }
                },
                show: false,
                className: customclass,
                onEscape: self.onEscape
            });

            var modal = parent.find("." + customclass);
            switch (action) {
                case "share":
                    modal.find('#' + currentValue).prop('checked', true);
                    break;
                case "create":
                case "rename":
                case "clone":
                    var $renderedInput = modal.find('input');
                    var affirmativeButton = modal.find('.affirmative');

                    $renderedInput.on('change keyup', function(event) {
                        if (!self.validateModalInputState(event))
                            affirmativeButton.prop('disabled', true);
                        else
                            affirmativeButton.prop('disabled', false);
                    });

                    self.confirmDialog.on("shown.bs.modal", function(event) {
                        var $renderedInput = modal.find('input');
                        var renderedInput = $renderedInput[0];
                        _.defer(function() {
                            renderedInput.focus();
                            renderedInput.setSelectionRange(0, renderedInput.value.length);
                        });
                    });

                    //Prevent enter from submitting form, but press ok instead
                    var formEle = modal.find('#modal-form');
                    formEle.on('submit', function(event) {
                        event.preventDefault();
                        $('[data-bb-handler="ok"]').click()
                    });

                    modal.find('.dialogValue').attr('value', currentValue);
                    break;
                default:
                    // do nothing
                    break;
            }

            self.confirmDialog.modal('show');
        },
        validateModalInputState: function(event) {
            return _.trim($(event.target).val()) !== '';
        },
        downloadFile: function(url) {
            var body = $('body');
            var downloadIframe = body.find('#download-iframe');

            if (downloadIframe.length === 0) {
                downloadIframe = body.append('<iframe style="display: none;" id="download-iframe"></iframe>').find('#download-iframe');
            }

            downloadIframe.attr('src', url);
        },
        promptFileUpload: function(parent) {
            var self = this;

            var uploadHolder = parent.find('#hidden-file-upload-holder');
            if (uploadHolder.length > 0) {
                uploadHolder.remove();
            }
            parent.append('<div id="hidden-file-upload-holder" style="border: 2px solid red;"><input class="hiddenFileUpload" name="attachment" type="file" /></div>');
            uploadHolder = parent.find('#hidden-file-upload-holder');

            var promiseFunctions = {
                resolve: null,
                reject: null
            };
            var promise = new Promise(function(resolve, reject) {
                promiseFunctions.resolve = resolve;
                promiseFunctions.reject = reject;
            });

            uploadHolder.find('.hiddenFileUpload').on('change', function() {
                promiseFunctions.resolve(this.files);
            });

            setTimeout(function() {
                promiseFunctions.reject('Upload Timed Out');
            }, self.uploadTimeout);

            // trigger the upload programmtically
            uploadHolder.find('.hiddenFileUpload').click();

            return promise;
        },
    },
    _validateForProjectPage: function _validateForProjectPage(scenarios) {
        var self = this;
        var projectPath = '';
        var foundProject = false;
        var foundProjectDetails = null;
        var tooManyProjects = false;
        var errorType = null;

        var invalidScenarios = [];
        var invalidProjects = [];

        var validationmsg;

        for (var i = 0; i < scenarios.length; i++) {
            if (scenarios[i].getScenarioType() === self.config.projectScenarioType) {
                if (!foundProject) {
                    foundProject = true;
                    foundProjectDetails = scenarios[i];
                } else {
                    invalidProjects.push(scenarios[i].getName());
                    errorType = 'tooManyProjects';
                }
            }

            if (errorType !== 'tooManyProjects') {
                if (i === 0) {
                    if (scenarios[i].getScenarioType() === self.config.projectScenarioType) {
                        var escapedProjectName = scenarios[i].getName().replace(/\\/g, '\\\\').replace(/\//g, '\\/');
                        var projectNamePlusSlashLength = escapedProjectName.length + 1;
                        projectPath = scenarios[i].getPath().substring(0, scenarios[i].getPath().length - projectNamePlusSlashLength);
                    } else {
                        errorType = 'projectInWrongPos';
                    }
                } else {
                    var pathIndex = scenarios[i].getPath().indexOf(projectPath);
                    var endOfPath = pathIndex + projectPath.length;

                    if (pathIndex < 0 || scenarios[i].getPath().charAt(endOfPath) !== '/') {
                        invalidScenarios.push(scenarios[i].getName());
                        errorType = 'incompatibleScenarios';
                    }
                }
            }

        }

        if (!foundProject) {
            errorType = 'noProjectScenario';
        }

        switch (errorType) {
            case 'noProjectScenario':
                validationmsg = 'There is no active project. Please return to the Manage Projects page and create or open a project.';
                break;
            case 'tooManyProjects':
                invalidProjects.unshift(foundProjectDetails.getName());
                validationmsg = 'You have added the following project' + ((invalidProjects.length > 1) ? 's' : '') + ' to the shelf: "' + invalidProjects.join('", "') + '". Please ensure that you only have one project scenario and that it is in the first position.';
                break;
            case 'incompatibleScenarios':
                validationmsg = 'There are scenarios from different projects other than "' + foundProjectDetails.getName() + '" on the shelf. Please remove the following scenario' + ((invalidScenarios.length > 1) ? 's: ' : ': "') + invalidScenarios.join('", "') + '".';
                break;
            case 'projectInWrongPos':
                validationmsg = 'Project "' + foundProjectDetails.getName() + '" is not in the correct shelf position. Please place it into the first position on the shelf.';
                break;
            default:
                validationmsg = "";
        }

        return validationmsg;
    },
    _validateForScenarioPage: function _validateForScenarioPage(scenarios, neededScenarioTypes) {
        var self = this;

        // a scenario page requirements is a superset of a project page requirements
        var projectvalidation = self._validateForProjectPage(scenarios);
        if (projectvalidation)
            return projectvalidation;

        // if match not specificed then all
        if (!neededScenarioTypes) {
            neededScenarioTypes = '*';
        }

        // must be at least one scenario as well as the project scenario
        if (scenarios.length === 1)
            return 'This view requires at least one scenario to be selected. Create a new scenario or select an existing scenario by clicking on the grey scenario shelf above.';

        // the extra scenarios must be of the required type
        var count = 0;
        for (var i = 1; i < scenarios.length; i++) {
            if (neededScenarioTypes === '*') {
                count++;
            } else {
                var index = neededScenarioTypes.indexOf(scenarios[i].getScenarioType());

                if (index > -1) {
                    count++;
                }
            }
        }
        // found no scenarios that meet type requirements
        if (count == 0)
            return 'To view this information please create a new scenario or select an existing scenario of the required type by clicking on the grey scenario shelf above.';

        // no validation errors
        return "";
    },
    _initShelfValidation: function() {
        var self = this;
        // if the shelf is empty its not valid
        if (self.view.getScenarioIds().length == 0) {
            self.shelfValidationMessage({
                text: 'There is no active project. Please create or open a project.',
                showNav: true,
            });
            self.shelfValid(false);
        } else {
            // shelf validation
            self.view
                .withAllScenarios()
                .withSummaryData()
                .once(function(scenarios) {
                    var msg;
                    if (self.config.viewType.toLowerCase() == "project")
                        msg = self.validateShelf('project', scenarios);
                    else if (self.config.viewType.toLowerCase() == "scenario")
                        msg = self.validateShelf('scenario', scenarios);

                    // else no validation required
                    if (msg) {
                        self.shelfValidationMessage({
                            text: msg
                        });
                        self.shelfValid(false);
                    } else {
                        self.shelfValidationMessage();
                        self.shelfValid(true);

                        self._initProjectRevisionTracking();
                    }
                })
                .start();
        }
    },
    _initProjectRevisionTracking: function() {
        var self = this;

        // observe the project entities that the project revision is impacted by
        var entities;
        if (self.config.projectEntities == "all")
            entities = self.app.getModelSchema().getAllEntities();
        else
            entities = self.config.projectEntities;

        // if there are entities that the project revision is impacted by
        if (entities.length > 0) {
            // make sure we get the project revision too
            entities = entities.concat([self.config.projectRevisionEntity]);
            self.view
                .withFirstScenario()
                .withEntities(entities)
                .notify(self._handleProjectEntityChangeNotification.bind(self))
                .start();
        };

        // do a revision check and collate a message if inconsistent
        // project revision is an incrementing randomly seeded number
        // newly loaded scenarios default to zero
        // a scenario is dirty when its revision is not zero and not the same as the project
        // but only if there is at least one scenairo on the shelf, to avoid a built in warning about requiring scenarios
        if (self.view.getScenarioIds().length > 0)
            self.view
            .withAllScenarios()
            .withEntities([self.config.projectRevisionEntity])
            .notify(self._handleProjectRevisionChangeNotification.bind(self))
            .start();
    },
    // call when a tracked project scenario entity is changed
    // scenario argument should always be the project scenario
    _handleProjectEntityChangeNotification: function(scenario) {
        var self = this;

        // if our project revision is zero this is a page load first fetch
        // so capture the current revision value
        if (self.projectRevision == 0)
            self.projectRevision = scenario.getScalar(self.config.projectRevisionEntity);
        // if our project revision is different to the incoming value
        else if (self.projectRevision != scenario.getScalar(self.config.projectRevisionEntity))
            // another user or mosel caused it to change so store it
            self.projectRevision = scenario.getScalar(self.config.projectRevisionEntity);
        else if (scenario.isEditable()) {
            // dont increment revision on a notify caused by execution status change. use editable flag to determine its a data change event
            
            // our current user caused the data to change, so increment the project revision
            var dataChange = scenario.modify();
            self.projectRevision++;
            dataChange.setScalar(self.config.projectRevisionEntity, self.projectRevision);
            dataChange.commit();
        }
    },
    _handleProjectRevisionChangeNotification: function(scenarios) {
        var self = this;

        var dirtyScenarios = [];
        $.each(scenarios, function(i, scenario) {
            if (i > 0) { // skip project scenario
                if (scenario.getScalar(self.config.projectRevisionEntity) > 0 && scenarios[0].getScalar(self.config.projectRevisionEntity) != scenario.getScalar(self.config.projectRevisionEntity))
                    dirtyScenarios.push(scenario.getName());
            }
        });
        var message;
        if (dirtyScenarios.length > 0)
            message = "The project configuration has changed since the following scenarios were executed: " + dirtyScenarios.join(", ");

        self.projectRevisionMessage(message);
    },
    _init: function() {
        var self = this;

        self.view = insight.getView();
        self.app = self.view.getApp();
        self.appId = self.app.getId();
        self.schema = self.app.getModelSchema();

        self.importOverlayDelay = 2000;

        // auto detect the insight version number
        if (typeof insight.getVersion == 'undefined' || insight.getVersion() === 4 || insight.getVersion().major === 4)
            self.api = new InsightRESTAPIv1();
        else
            self.api = new InsightRESTAPI();

        // fetch the list of project folders for a management view
        if (self.config.viewType == "manage")
            self._getProjects();

        /* global VDL */
        VDL('project-overlay', {
            tag: 'project-overlay',
            attributes: [],
            template: '<div data-bind="visible: projectframework.showLoadingOverlay" class="project-loading-overlay"><img class="project-loading-img" src="../../../../distrib/insight-4.8/images/ajax_loader_109.gif" width="109" height="109"/><span style="display: block;" class="msg" data-bind="text: loadingOverlayMessage"></span><span>Please do not navigate away from the page</span></div>',
            createViewModel: function(params) {
                return new OverlayExtension(self);
            }
        });

        self._initShelfValidation();
    }
};

// Initialise the system
function ProjectFramework(userconfig) {
    var self = this;

    $.extend(self, {
        // configuration defaults
        config: {
            projectScenarioType: "PROJECT", // custom scenario type id for project scenario type
            defaultView: '', // the view that Open Project navigates to
            manageView: 'Manage', // id of the project management view
            viewType: "", // type of the current view. project | scenario. Any other value means neither
            projectEntities: [], // list of project entities that impact the project revision for the current view. "all" or [entity names]
            projectRevisionEntity: "ProjectRevision", // the entity storing the project revision,
            projectAttributes: [] // list of entities that are fetched to augment project object for management view
        }
    });
    $.extend(self.config, userconfig);

    return self;
}

/*
Custom overlay for during custom orchestrated actions like import project
*/
/* global projectframework */
function OverlayExtension(parent) {
    var self = this;
    self.framework = parent;
    self.registerEventListeners();
}
OverlayExtension.prototype = {
    framework: null,
    loadingOverlayMessage: ko.observable(''),
    registerEventListeners: function() {
        var self = this;
        $(window)
            .on('project.overlay.show', this.show.bind(this))
            .on('project.overlay.hide', this.hide.bind(this))
            .on('project.overlay.setMessage', this.setMessage.bind(this));

        self.framework.showLoadingOverlay.subscribe(this.setMessageOffset);
    },
    setMessageOffset: function(overlayShown) {},
    show: function(evnt, initialMessage) {
        var self = this;
        self.framework.view.configure({
            executionOverlay: false
        });

        if (initialMessage) {
            var self = this;
            self.setMessage(initialMessage);
        }
        self.framework.showLoadingOverlay(true);
    },
    hide: function() {
        var self = this;
        self.framework.view.configure({
            executionOverlay: true
        });

        self.framework.showLoadingOverlay(false);
        self.setMessage('');
    },
    setMessage: function() {
        var self = this;
        var message = arguments.length === 2 ? arguments[1] : arguments[0];
        self.loadingOverlayMessage(message);
    }
};

// REST API interface for v1 of the REST API (Insight 4)
function InsightRESTAPIv1() {
    var self = this;
    self.version = 1;
    return this;
}
InsightRESTAPIv1.prototype = {
    BASE_REST_ENDPOINT: '/data/',
    contentNegotiation: 'application/json',

    getVersion: function() {
        var self = this;
        return self.version;
    },
    restRequest: function(path, type, data) {
        var self = this;
        var request = {
            url: insight.resolveRestEndpoint(self.BASE_REST_ENDPOINT + path),
            type: type,
            data: data,
            headers: {
                'Accept': self.contentNegotiation,
                'Content-Type': self.contentNegotiation + ';charset=UTF-8'
            }
        };

        return new Promise(function(resolve, reject) {
            var jqXHR = $.ajax(request);

            jqXHR.done(function(data, textStatus, jqXHR) {
                resolve(data);
            });

            jqXHR.fail(function(data, textStatus, jqXHR) {
                reject(textStatus);
            });
        });
    },
    getProjects: function(appId) {
        var self = this;
        return self.restRequest('project/' + appId + '/children?maxResults=9999', 'GET')
            .then(function(data) {
                var projects = [];
                var children = data.items;

                // filter out scenarios, projects are root folders
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    // mask out those starting with underscore
                    if (child.objectType === 'FOLDER' && !(child.displayName.indexOf("_") == 0)) {
                        projects.push(child);
                    }
                };

                // standardize on name
                for (var i = 0; i < projects.length; i++) {
                    projects[i].name = projects[i].displayName;
                    delete projects[i].displayName;
                }


                // sort case insensitive
                projects.sort(function(a, b) {
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });

                return projects;
            });
    },
    getChildren: function(folderId) {
        var self = this;
        return self.restRequest('folder/' + folderId + '/children?maxResults=9999', 'GET')
            .then(function(data) {
                var children = data.items;

                // standarize naming property
                for (var i = 0; i < children.length; i++) {
                    children[i].name = children[i].displayName;
                    delete children[i].displayName;
                }
                return children;
            });
    },
    createScenario: function(app, parent, name, type) {
        var self = this;

        return app.createScenario(parent, name, type)
            .then(function(scenario) {
                // standarize name property
                scenario.name = scenario.displayName;
                delete scenario.displayName;
                return scenario;
            });
    },
    cloneScenario: function(scenarioId, parent, newName) {
        var self = this;

        var payload = {
            displayName: newName,
            sourceScenarioId: scenarioId,
            parent: {
                displayName: parent.displayName,
                id: parent.id,
                objectType: parent.objectType,
                url: parent.url
            }
        };

        return self.restRequest('scenario', 'POST', JSON.stringify(payload));
    },
    createRootFolder: function(app, name) {
        var self = this;

        // no parent specified == root folder
        return app.createFolder(name)
            .then(function(folder) {
                // standarize name property
                folder.name = folder.displayName;
                delete folder.displayName;
                return folder;
            });
    },
    deleteFolder: function(id) {
        var self = this;
        return self.restRequest('folder/' + id, 'DELETE');
    },
    renameScenario: function(scenarioId, newName) {
        var self = this;

        var payload = {
            id: scenarioId,
            displayName: newName
        };
        return self.restRequest('scenario/' + scenarioId, 'POST', JSON.stringify(payload));
    },
    renameFolder: function(folderId, newName) {
        var self = this;

        var payload = {
            id: folderId,
            displayName: newName
        };
        return self.restRequest('folder/' + folderId, 'POST', JSON.stringify(payload));
    },
    shareScenario: function(id, shareStatus) {
        var self = this;

        if (shareStatus != "PRIVATE" && shareStatus != "READONLY" && shareStatus != "FULLACCESS")
            return Promise.reject("Invalid share status");

        var payload = {
            id: id,
            shareStatus: shareStatus
        };
        return self.restRequest('scenario/' + id, 'POST', JSON.stringify(payload));
    },
    shareFolder: function(id, shareStatus) {
        var self = this;

        if (shareStatus != "PRIVATE" && shareStatus != "READONLY" && shareStatus != "FULLACCESS")
            return Promise.reject("Invalid share status");

        var payload = {
            id: id,
            shareStatus: shareStatus
        };
        return self.restRequest('folder/' + id, 'POST', JSON.stringify(payload));
    },
    moveFolderToRoot: function(appId, folder) {
        var self = this;

        // deep clone the folder natively
        var payload = JSON.parse(JSON.stringify(folder));
        // adjust the fields to REST v1 convention
        payload.displayName = payload.name;
        delete payload.name;

        return self.restRequest('project/' + appId + '/children', 'POST', JSON.stringify(payload))
            .then(function(newFolder) {
                // standarize name property
                newFolder.name = newFolder.displayName;
                delete newFolder.displayName;
                return newFolder;
            });
    },
    getFolderExportDownloadURL: function(folderId) {
        var self = this;
        return insight.resolveRestEndpoint(self.BASE_REST_ENDPOINT + 'folder/' + folderId + '/export');
    },
    uploadImportFile: function(workingFolder, fileUploads) {
        var self = this;

        var file = fileUploads[0];
        var formData = new FormData();

        formData.append("scenarios-file", file);
        formData.append("parent-json", JSON.stringify({
            id: workingFolder.id,
            displayName: workingFolder.displayName,
            objectType: workingFolder.objectType,
            url: workingFolder.url
        }));

        var request = {
            url: insight.resolveRestEndpoint(this.BASE_REST_ENDPOINT + 'scenario'),
            data: formData,
            cache: false,
            context: {
                "scenarios-file": file.name,
                "size": file.size
            },
            contentType: false,
            processData: false,
            dataType: 'json',
            type: 'POST'
        };

        return new Promise(function(resolve, reject) {
            var jqXHR = $.ajax(request);

            jqXHR.done(function(data, textStatus, jqXHR) {
                resolve({
                    folders: data.folders.items,
                    scenarios: data.scenarios.items
                });
            });

            jqXHR.fail(function(data, textStatus, jqXHR) {
                reject(data);
            });
        });
    },
    // dummy for testing
    exportFolder: function() {},
    getScenarioEntities: function(scenarioId, entities) {
        var self = this;
        
        var params = [];
        for (let i=0;i<entities.length;i++)
            params.push("name=" + entities[i]);
        var param = params.join("&");
        
        return self.restRequest("scenario/" + scenarioId + "/data/entities" + "?" + param, 'GET');
    }
}

// REST API interface for v2 of the REST API (Insight 5)
function InsightRESTAPI() {
    var self = this;
    self.version = 2;
    return this;
}
InsightRESTAPI.prototype = {
    BASE_REST_ENDPOINT: '/api/',
    contentNegotiation: 'application/vnd.com.fico.xpress.insight.v2+json',
    uploadPollingInterval: 1000,

    getVersion: function() {
        var self = this;
        return self.version;
    },
    restRequest: function(path, type, data) {
        var self = this;
        var request = {
            url: insight.resolveRestEndpoint(self.BASE_REST_ENDPOINT + path),
            type: type,
            data: data,
            headers: {
                'Accept': self.contentNegotiation,
                'Content-Type': self.contentNegotiation + ';charset=UTF-8'
            }
        };

        return new Promise(function(resolve, reject) {
            var jqXHR = $.ajax(request);

            jqXHR.done(function(response) {
                if (response)
                    resolve(response);
                else
                    resolve();
            });

            jqXHR.fail(function(jqXHR) {
                var code;
                var message;

                // if there is a response body
                if (jqXHR.responseJSON) {
                    var response = jqXHR.responseJSON;

                    // prefer the more detailed inner error
                    if (response.error.innerError) {
                        code = response.error.innerError.code;
                        message = response.error.innerError.message;
                    } else {
                        code = response.error.code;
                        message = response.error.message;
                    }
                } else {
                    // theres no response body for this error so take the raw XHR object fields
                    code = jqXHR.status;
                    message = jqXHR.statusText;
                }
                reject(message);
            });
        });
    },
    getProjects: function(appId) {
        var self = this;
        return self.restRequest('apps/' + appId + '/children?page=0&size=9999', 'GET')
            .then(function(children) {
                var projects = [];
                children = children.content; // strip away the container

                // filter out scenarios, projects are root folders
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    // mask out those starting with underscore
                    if (child.objectType === 'FOLDER' && !(child.name.indexOf("_") == 0)) {
                        projects.push(child);
                    }
                };

                // sort case insensitive
                projects.sort(function(a, b) {
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });

                return projects;
            });
    },
    getChildren: function(folderId) {
        var self = this;
        return self.restRequest('folders/' + folderId + '/children?page=0&size=9999', 'GET')
            .then(function(children) {
                return children.content; // strip away the container
            });
    },
    createScenario: function(app, parent, name, type) {
        var self = this;

        return app.createScenario(parent, name, type)
            .then(function(scenario) {
                // standarize name property
                scenario.name = scenario.displayName;
                delete scenario.displayName;
                return scenario;
            });
    },
    cloneScenario: function(scenarioId, parent, newName) {
        var self = this;

        var payload = {
            name: newName,
            "sourceScenario": {
                "id": scenarioId,
                "objectType": "SCENARIO"
            },
            parent: {
                name: parent.name,
                id: parent.id,
                objectType: parent.objectType,
                url: parent.url
            }
        };
        return self.restRequest('scenarios', 'POST', JSON.stringify(payload));
    },
    createRootFolder: function(app, name) {
        var self = this;

        return app.createFolder(name)
            .then(function(folder) {
                // standarize name property
                folder.name = folder.displayName;
                delete folder.displayName;
                return folder;
            });
    },
    deleteFolder: function(id) {
        var self = this;
        return self.restRequest('folders/' + id, 'DELETE');
    },
    renameScenario: function(scenarioId, newName) {
        var self = this;

        var payload = {
            id: scenarioId,
            name: newName
        };
        return self.restRequest('scenarios/' + scenarioId, 'PATCH', JSON.stringify(payload));
    },
    renameFolder: function(folderId, newName) {
        var self = this;

        var payload = {
            id: folderId,
            name: newName
        };
        return self.restRequest('folders/' + folderId, 'PATCH', JSON.stringify(payload));
    },
    shareScenario: function(id, shareStatus) {
        var self = this;

        if (shareStatus != "PRIVATE" && shareStatus != "READONLY" && shareStatus != "FULLACCESS")
            return Promise.reject("Invalid share status");

        var payload = {
            id: id,
            shareStatus: shareStatus
        };
        return self.restRequest('scenarios/' + id, 'PATCH', JSON.stringify(payload));
    },
    shareFolder: function(id, shareStatus) {
        var self = this;

        if (shareStatus != "PRIVATE" && shareStatus != "READONLY" && shareStatus != "FULLACCESS")
            return Promise.reject("Invalid share status");

        var payload = {
            id: id,
            shareStatus: shareStatus
        };
        return self.restRequest('folders/' + id, 'PATCH', JSON.stringify(payload));
    },
    moveFolderToRoot: function(appId, folder) {
        var self = this;
        return self.restRequest('apps/' + appId + '/children', 'POST', JSON.stringify(folder));
    },
    uploadImportFile: function(workingFolder, fileUploads) {
        var self = this;

        var file = fileUploads[0];
        var formData = new FormData();

        formData.append("insightFile", file);
        formData.append("importUploadRequest", JSON.stringify({
            "importType": "FOLDER_OR_SCENARIO",
            "target": {
                id: workingFolder.id,
                displayName: workingFolder.displayName,
                objectType: workingFolder.objectType,
                url: workingFolder.url
            }
        }));

        var request = {
            url: insight.resolveRestEndpoint(this.BASE_REST_ENDPOINT + 'portations/imports'),
            headers: {
                'Accept': self.contentNegotiation
            },
            data: formData,
            cache: false,
            context: {
                "insightFile": file.name,
                "size": file.size
            },
            contentType: false,
            processData: false,
            dataType: 'json',
            type: 'POST'
        };

        return new Promise(function(resolve, reject) {
                var jqXHR = $.ajax(request);

                jqXHR.done(function(data, textStatus, jqXHR) {
                    resolve(data);
                });

                jqXHR.fail(function(data, textStatus, jqXHR) {
                    reject(data);
                });
            })
            .then(function(data) {
                // portations are asyncronous so now need to poll for completion
                return self.waitForUpload(data.id);
            })
    },
    waitForUpload: function(portationId) {
        var self = this;
        // start polling and return a promise which resolves when the polling completes
        return new Promise(function(resolve, reject) {
            // repeated polling
            self.polling = window.setInterval(
                function() {
                    self.restRequest("portations/imports/" + portationId, "GET")
                        .then(function(response) {
                            // if finished then stop the polling
                            if (response.status == "SUCCESS") {
                                window.clearInterval(self.polling);

                                var folders = [];
                                var scenarios = [];

                                // did we import a folder
                                if (response.reference.objectType == "FOLDER") {
                                    var folder = response.reference;
                                    folders.push(folder);

                                    self.getChildren(folder.id)
                                        .then(function(children) {
                                            for (var i = 0; i < children.length; i++) {
                                                if (children[i].objectType == "SCENARIO")
                                                    scenarios.push(children[i]);
                                            }
                                            resolve({
                                                folders: folders,
                                                scenarios: scenarios
                                            });
                                        });
                                } else {
                                    resolve({
                                        folders: [],
                                        scenarios: []
                                    });
                                }
                            } else if (response.status == "ERROR")
                                throw (response.errorMessages.items[0]);
                            // any other status and we are still going to keep polling
                        })
                        .catch(function(error) {
                            window.clearInterval(self.polling);
                            reject(error);
                        });
                },
                self.uploadPollingInterval
            );
        });
    },
    exportFolder: function(projectFolder) {
        var self = this;
        // request the export
        var payload = {
            source: projectFolder
        };
        return self.restRequest('portations/exports', 'POST', JSON.stringify(payload));
    },
    getScenarioEntities: function(scenarioId, entities) {
        var self = this;
        var payload = {
            entityNames: entities
        };
        
        return self.restRequest('scenarios/' + scenarioId + '/data', 'POST', JSON.stringify(payload))
            .then(response => {
                var data = {};
                for (let j=0;j<entities.length;j++)
                    data[entities[j]] = response.entities[entities[j]].value.toString();
                return data;
            });
    }
    
    
}